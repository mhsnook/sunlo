import { describe, expect, test } from 'vitest'
import {
	findCallSite,
	getOklchTwMerge,
	summarizeOverrides,
} from './twmerge-oklch'

const twMerge = getOklchTwMerge()

describe('oklch axis utilities compose', () => {
	test('text chroma + text luminance compose (different axes)', () => {
		const input = 'text-c-lo text-lc-6'
		expect(twMerge(input)).toBe(input)
	})

	test('bg axes all three compose', () => {
		const input = 'bg-lc-5 bg-c-mid bg-h-primary'
		expect(twMerge(input)).toBe(input)
	})

	test('border axes compose', () => {
		const input = 'border-lc-3 border-c-mlo border-h-accent'
		expect(twMerge(input)).toBe(input)
	})

	test('shorthand + per-axis override composes', () => {
		const input = 'bg-1-mlo-primary bg-h-accent'
		expect(twMerge(input)).toBe(input)
	})

	test('global hue + per-property hue compose', () => {
		const input = 'hue-danger bg-h-primary'
		expect(twMerge(input)).toBe(input)
	})
})

describe('oklch axis utilities still flag same-axis conflicts', () => {
	test('two text-lc values conflict', () => {
		expect(twMerge('text-lc-3 text-lc-6')).toBe('text-lc-6')
	})

	test('two bg-h values conflict', () => {
		expect(twMerge('bg-h-primary bg-h-accent')).toBe('bg-h-accent')
	})

	test('two three-axis shorthands conflict', () => {
		expect(twMerge('bg-1-mlo-primary bg-3-mhi-accent')).toBe('bg-3-mhi-accent')
	})

	test('two global hues conflict', () => {
		expect(twMerge('hue-primary hue-accent')).toBe('hue-accent')
	})
})

describe('rounded-squircle joins the rounded group', () => {
	test('rounded-xl rounded-squircle collapses', () => {
		expect(twMerge('rounded-xl rounded-squircle')).toBe('rounded-squircle')
	})

	test('rounded-squircle rounded-full collapses', () => {
		expect(twMerge('rounded-squircle rounded-full')).toBe('rounded-full')
	})
})

describe('real-world conflicts from user-reported example still flag', () => {
	test('rounded-xl + rounded-full collapses', () => {
		expect(twMerge('rounded-xl rounded-full')).toBe('rounded-full')
	})

	test('transition-colors + transition-all collapses', () => {
		expect(twMerge('transition-colors transition-all')).toBe('transition-all')
	})
})

describe('summarizeOverrides suppresses no-op duplicates', () => {
	test('pure duplicate returns null', () => {
		const raw = 'w-72 w-72'
		expect(summarizeOverrides(raw, twMerge(raw))).toBeNull()
	})

	test('duplicate in the middle of unchanged classes returns null', () => {
		const raw = 'p-2 w-72 rounded-md w-72'
		expect(summarizeOverrides(raw, twMerge(raw))).toBeNull()
	})

	test('user-reported popover case: only w-72 dup, no warning', () => {
		const raw =
			'bg-popover text-popover-foreground z-50 w-72 rounded-md border shadow-md outline-hidden w-72'
		expect(summarizeOverrides(raw, twMerge(raw))).toBeNull()
	})

	test('real override surfaces with replacement', () => {
		const raw = 'rounded-md w-72 p-4 outline-hidden w-72 p-2'
		const merged = twMerge(raw)
		expect(summarizeOverrides(raw, merged)).toEqual([
			{ dropped: 'p-4', replacement: 'p-2' },
		])
	})

	test('multiple real overrides surface together', () => {
		const raw =
			'border border-transparent transition-colors rounded-xl border-border/50 transition-all rounded-full'
		expect(summarizeOverrides(raw, twMerge(raw))).toEqual([
			{ dropped: 'border-transparent', replacement: 'border-border/50' },
			{ dropped: 'transition-colors', replacement: 'transition-all' },
			{ dropped: 'rounded-xl', replacement: 'rounded-full' },
		])
	})

	test('dup + real override: only override is reported', () => {
		const raw = 'w-72 p-4 w-72 p-2'
		expect(summarizeOverrides(raw, twMerge(raw))).toEqual([
			{ dropped: 'p-4', replacement: 'p-2' },
		])
	})
})

describe('findCallSite extracts the calling file:line from a stack', () => {
	test('chromium-style stack: skips utils.ts and returns first src/ frame', () => {
		const stack = [
			'Error',
			'    at cn (http://localhost:5173/src/lib/utils.ts:12:23)',
			'    at Button (http://localhost:5173/src/components/ui/button.tsx:55:20)',
			'    at div',
		].join('\n')
		expect(findCallSite(stack)).toBe('src/components/ui/button.tsx:55')
	})

	test('firefox-style stack', () => {
		const stack = [
			'cn@http://localhost:5173/src/lib/utils.ts:12:23',
			'Popover@http://localhost:5173/src/components/ui/popover.tsx:42:15',
		].join('\n')
		expect(findCallSite(stack)).toBe('src/components/ui/popover.tsx:42')
	})

	test('strips Vite ?t= query suffix from path', () => {
		const stack = [
			'Error',
			'    at cn (http://localhost:5173/src/lib/utils.ts:12:23)',
			'    at Foo (http://localhost:5173/src/components/foo.tsx?t=1700000000000:10:5)',
		].join('\n')
		expect(findCallSite(stack)).toBe('src/components/foo.tsx:10')
	})

	test('skips frames inside twmerge-oklch itself', () => {
		const stack = [
			'    at cn (http://localhost:5173/src/lib/utils.ts:12:23)',
			'    at devCheckTwMerge (http://localhost:5173/src/lib/twmerge-oklch.ts:8:1)',
			'    at App (http://localhost:5173/src/app.tsx:5:5)',
		].join('\n')
		expect(findCallSite(stack)).toBe('src/app.tsx:5')
	})

	test('returns undefined when no src/ frame is present', () => {
		expect(findCallSite('Error\n    at <anonymous>')).toBeUndefined()
		expect(findCallSite(undefined)).toBeUndefined()
	})
})
