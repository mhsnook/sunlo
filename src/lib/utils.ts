import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

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

export function round(num: number, pow: number = 2) {
	return num === undefined || num === null ?
			'null'
		:	Math.pow(10, -pow) * Math.round(Math.pow(10, pow) * num)
}

export function dateDiff(prev_at: string | Date, later_at?: string | Date) {
	const later: Date =
		!later_at ? new Date()
		: typeof later_at === 'string' ? new Date(later_at)
		: later_at
	const prev: Date = typeof prev_at === 'string' ? new Date(prev_at) : prev_at
	return (later - prev) / 1000 / 24 / 60 / 60
}

export function retrievability(
	prev_at: string | Date | null,
	stability: number,
	later_at?: string | Date
) {
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

export function todayString() {
	const now = new Date()
	// some people study after midnight
	now.setHours(now.getHours() - 4)
	return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
}
