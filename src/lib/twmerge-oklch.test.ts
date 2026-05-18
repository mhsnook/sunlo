import { describe, expect, test } from 'vitest'
import { getOklchTwMerge } from './twmerge-oklch'

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
