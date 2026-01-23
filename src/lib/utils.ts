import type { uuid } from '@/types/main'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { DeckMetaType } from '@/lib/schemas'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { useState } from 'react'

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

export function dateDiff(prev_at: string | Date, later_at?: string | Date) {
	const later: Date =
		!later_at ? new Date()
		: typeof later_at === 'string' ? new Date(later_at)
		: later_at
	const prev: Date = typeof prev_at === 'string' ? new Date(prev_at) : prev_at
	// @ts-expect-error it's actually fine to subract date objects like ints
	return (later - prev) / 1000 / 24 / 60 / 60
}

export function retrievability(
	prev_at: string | Date | null,
	stability: number,
	later_at?: string | Date
): number {
	if (!prev_at || !stability)
		throw Error(
			'Something went wrong calcaulating retrievability on the client'
		)

	const F = 19.0 / 81.0,
		C = -0.5
	const diff = dateDiff(prev_at, later_at)
	return Math.pow(1.0 + F * (diff / stability), C)
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
	a.created_at > b.created_at ? 1
	: a.created_at < b.created_at ? -1
	: a.lang > b.lang ? 1
	: -1

// sort DESC most recent first
export const sortDecksByActivity = (a: DeckMetaType, b: DeckMetaType) => {
	const aDate = a.most_recent_review_at ?? a.created_at
	const bDate = b.most_recent_review_at ?? b.created_at

	return (
		aDate > bDate ? -1
		: aDate < bDate ? 1
		: a.lang > b.lang ? -1
		: 1
	)
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
