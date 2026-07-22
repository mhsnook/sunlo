import type { uuid } from '@/types/main'
import { type ClassValue, clsx } from 'clsx'
import { type ConfigExtension, extendTailwindMerge } from 'tailwind-merge'
import type { DeckMetaType } from '@/features/deck/schemas'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { useState } from 'react'

/* ── OKLCH single-axis utilities × tailwind-merge ──────────────────────────
   Our color utilities decompose into three same-prefix classes per property
   (`bg-lc-7 bg-chroma-mhi bg-hue-primary`). Out of the box tailwind-merge
   treats those as conflicting `bg-*` utilities and keeps only the last one,
   silently dropping two of the three axes. Register each (property × axis) as
   its own conflict group so the axes are independent: two `bg-lc-*` still
   collapse to the last, but `bg-lc-*` and `bg-chroma-*` coexist. */
const HUES = new Set([
	'primary',
	'accent',
	'success',
	'warning',
	'danger',
	'info',
	'neutral',
])
const CHROMAS = new Set(['lo', 'mlo', 'mid', 'mhi', 'hi'])
const isArbitrary = (v: string) => v.startsWith('[') && v.endsWith(']')
const isHue = (v: string) => HUES.has(v) || isArbitrary(v)
const isChroma = (v: string) => CHROMAS.has(v) || isArbitrary(v)
const isLc = (v: string) =>
	/^(?:\d+|base|fore|none|full|up-[123]|down-[123]|\[\d+\])$/.test(v)

type ClassGroups = NonNullable<
	ConfigExtension<string, string>['extend']
>['classGroups']
const oklchClassGroups: ClassGroups = {}
for (const p of ['bg', 'text', 'border', 'from', 'to']) {
	oklchClassGroups[`ok-${p}-lc`] = [{ [p]: [{ lc: [isLc] }] }]
	oklchClassGroups[`ok-${p}-chroma`] = [{ [p]: [{ chroma: [isChroma] }] }]
	oklchClassGroups[`ok-${p}-hue`] = [{ [p]: [{ hue: [isHue] }] }]
}
// border-b sets border-bottom-color — a separate property from border-color
oklchClassGroups['ok-border-b-lc'] = [{ border: [{ b: [{ lc: [isLc] }] }] }]
oklchClassGroups['ok-border-b-chroma'] = [
	{ border: [{ b: [{ chroma: [isChroma] }] }] },
]
oklchClassGroups['ok-border-b-hue'] = [{ border: [{ b: [{ hue: [isHue] }] }] }]
// cascade seeders (apply no property, set an axis for all descendants)
oklchClassGroups['ok-seed-hue'] = [{ hue: [isHue] }]
oklchClassGroups['ok-seed-chroma'] = [{ chroma: [isChroma] }]

const twMerge = extendTailwindMerge({
	extend: { classGroups: oklchClassGroups },
})

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function mapArray<T extends Record<string, unknown>, K extends keyof T>(
	arr: ReadonlyArray<T> | undefined | null,
	key: K
): Record<string, T> {
	if (!key) throw new Error('Must provide a key to map against')
	if (!arr) return {} // uninitialized or null array returns empty object

	return arr.reduce(
		(acc, item) => {
			const itemKey = item[key]
			if (typeof itemKey === 'string') {
				acc[itemKey] = item
			}
			return acc
		},
		{} as Record<string, T>
	)
}

/*
	returns a map-object of _arrays_ of items matching the key
	mapArrays(arr, 'id') --> {
		1: [{id: 1, val: 'a'}],
		2: [{id: 2, val: 'b'}, {id: 2, val: 'c' }]
	}
*/
export function mapArrays<T extends Record<string, unknown>, K extends keyof T>(
	arr: Array<T>,
	key: K
) {
	if (!key) throw new Error('Must provide a key to map against')
	if (!arr) return {} // uninitialized or null array returns empty object

	return arr.reduce(
		(result, item) => {
			const itemKey = item[key]
			if (typeof itemKey === 'string') {
				result[itemKey] = [...(result[itemKey] ?? []), item]
			}
			return result
		},
		{} as Record<string, Array<T>>
	)
}

export function round(num: number, places: number = 2): number {
	return Math.pow(10, -places) * Math.round(Math.pow(10, places) * num)
}

/**
 * Raw elapsed time between two timestamps in fractional days.
 * Does NOT respect the 4am session-day boundary — use sessionDaysDiff() for
 * display purposes. This function is used by the FSRS algorithm where the
 * precise elapsed time matters (e.g. computing retrievability decay).
 */
export function dateDiff(prev_at: string | Date, later_at?: string | Date) {
	const later: Date = !later_at
		? new Date()
		: typeof later_at === 'string'
			? new Date(later_at)
			: later_at
	const prev: Date = typeof prev_at === 'string' ? new Date(prev_at) : prev_at
	// @ts-expect-error it's actually fine to subract date objects like ints
	return (later - prev) / 1000 / 24 / 60 / 60
}

/**
 * Compute the number of calendar days between two dates using the 4am day boundary.
 * Returns whole days (positive = later is after prev in session-day terms).
 */
export function sessionDaysDiff(
	prev_at: string | Date,
	later_at?: string | Date
): number {
	const later = !later_at
		? new Date()
		: typeof later_at === 'string'
			? new Date(later_at)
			: later_at
	const prev = typeof prev_at === 'string' ? new Date(prev_at) : prev_at

	// Shift both by -4 hours so 4am becomes the day boundary
	const adjustedLater = new Date(later)
	adjustedLater.setHours(adjustedLater.getHours() - 4)
	const adjustedPrev = new Date(prev)
	adjustedPrev.setHours(adjustedPrev.getHours() - 4)

	// Compare calendar dates only (strip time)
	const laterDay = new Date(
		adjustedLater.getFullYear(),
		adjustedLater.getMonth(),
		adjustedLater.getDate()
	)
	const prevDay = new Date(
		adjustedPrev.getFullYear(),
		adjustedPrev.getMonth(),
		adjustedPrev.getDate()
	)

	return Math.round(
		(laterDay.getTime() - prevDay.getTime()) / (1000 * 60 * 60 * 24)
	)
}

function makeItHave2Digits(input: string | number) {
	const startingString = String(input)
	return `0${startingString}`.slice(-2)
}

export function todayString() {
	const now = new Date()
	// some people study after midnight
	now.setHours(now.getHours() - 4)
	return `${now.getFullYear()}-${makeItHave2Digits(now.getMonth() + 1)}-${makeItHave2Digits(now.getDate())}`
}

/**
 * Calculate hours until the next 4am (when the day session resets)
 */
export function hoursUntil4am(): number {
	const now = new Date()
	const next4am = new Date(now)

	// Set to 4am today
	next4am.setHours(4, 0, 0, 0)

	// If we're past 4am today, move to 4am tomorrow
	if (now >= next4am) {
		next4am.setDate(next4am.getDate() + 1)
	}

	const diffMs = next4am.getTime() - now.getTime()
	return Math.ceil(diffMs / (1000 * 60 * 60))
}

export function min0(num: number) {
	return Math.max(0, num)
}

export function arrayUnion(arrs: Array<Array<uuid>>): Array<uuid> {
	return [...new Set(arrs.flat())]
}

export function arrayDifference(
	arr1: Array<uuid>,
	arr2: Array<Array<uuid>>
): Array<uuid> {
	const set2 = new Set(arr2.flat())
	return arr1.filter((item) => !set2.has(item))
}

export function nullSubmit(event: {
	preventDefault: () => void
	stopPropagation: () => void
}) {
	event.preventDefault()
	event.stopPropagation()
}

// sort ASC earliest first
export const sortDecksByCreation = (
	a: Partial<DeckMetaType> & { created_at: string; lang: string },
	b: Partial<DeckMetaType> & { created_at: string; lang: string }
) =>
	a.created_at > b.created_at
		? 1
		: a.created_at < b.created_at
			? -1
			: a.lang > b.lang
				? 1
				: -1

// sort DESC most recent first
export const sortDecksByActivity = (a: DeckMetaType, b: DeckMetaType) => {
	const aDate = a.most_recent_review_at ?? a.created_at
	const bDate = b.most_recent_review_at ?? b.created_at

	return aDate > bDate ? -1 : aDate < bDate ? 1 : a.lang > b.lang ? -1 : 1
}

export const preventDefaultCallback = (e: { preventDefault: () => void }) =>
	e.preventDefault()

export function isNativeAppUserAgent() {
	return (
		('standalone' in window.navigator && window.navigator?.standalone) ||
		window.matchMedia('(display-mode: standalone)').matches
	)
}

export function copyLink(url?: string, fallback = true) {
	if (!navigator?.clipboard) toastError('Failed to copy link')
	if (!fallback && !url) {
		throw new Error('No url to copy')
	} else
		navigator.clipboard
			.writeText(url ?? window?.location?.href)
			.then(() => {
				toastSuccess('Link copied to clipboard')
			})
			.catch(() => {
				toastError('Failed to copy link')
			})
}

export function removeSbTokens() {
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i)
		if (key && /^sb-.+-auth-token$/.test(key)) {
			localStorage.removeItem(key)
		}
	}
}

export function useOneRandomly<T>(array: T[]) {
	const [index] = useState(() => {
		const r = Math.random()
		return Array.isArray(array) ? Math.floor(r * array.length) : 0
	})
	return array[index]
}
