import type { FormEvent } from 'react'
import type { uuid } from '@/types/main'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import supabase from './supabase-client'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

// this is type-funky bc we're using dynamic keys (TODO consider Map)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapArray<T extends Record<string, any>, K extends keyof T>(
	arr: Array<T>,
	key: K
) {
	if (!key) throw new Error('Must provide a key to map against')
	if (!arr) return {} // uninitialized or null array returns empty object

	return arr.reduce(
		(result, item) => {
			const itemKey = item[key]
			if (typeof itemKey === 'string') {
				result[itemKey] = item
			}
			return result
		},
		{} as Record<K, T>
	)
}

export function mapArrays<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	T extends Record<string, any>,
	K extends keyof T,
>(arr: Array<T>, key: K) {
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
		{} as Record<K, Array<T>>
	)
}

function trimmedNumberString(num: number, places: number): string {
	// We may end up with string like 5.1234.00 and that's okay
	const content = num.toString() + '.' + '0'.repeat(places)

	return content.substring(0, content.indexOf('.') + places + 1)
}

export function round(num: number, places: number = 2): number {
	return Math.pow(10, -places) * Math.round(Math.pow(10, places) * num)
}

export function roundAndTrim(num: number, places: number = 2): string {
	return trimmedNumberString(round(num, places), places)
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

export function intervals() {
	return [1, 2, 3, 4]
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

export function arrayOverlap(
	arr1: Array<uuid>,
	arr2: Array<uuid>
): Array<uuid> {
	const set2 = new Set(arr2)
	return arr1.filter((item) => set2.has(item))
}

export function avatarUrlify(path: string | null): string {
	return !path ? '' : (
			supabase.storage.from('avatars').getPublicUrl(path).data?.publicUrl
		)
}

export function nullSubmit(event: FormEvent<HTMLFormElement>): void {
	event.preventDefault()
	event.stopPropagation()
}
