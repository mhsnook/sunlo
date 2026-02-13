import { describe, it, expect } from 'vitest'
import {
	mapArray,
	mapArrays,
	round,
	dateDiff,
	min0,
	arrayUnion,
	arrayDifference,
	sortDecksByCreation,
	sortDecksByActivity,
} from './utils'

describe('mapArray', () => {
	it('maps array by key to object', () => {
		const arr = [
			{ id: 'a', val: 1 },
			{ id: 'b', val: 2 },
		]
		const result = mapArray(arr, 'id')
		expect(result).toEqual({
			a: { id: 'a', val: 1 },
			b: { id: 'b', val: 2 },
		})
	})

	it('last item wins for duplicate keys', () => {
		const arr = [
			{ id: 'a', val: 1 },
			{ id: 'a', val: 2 },
		]
		const result = mapArray(arr, 'id')
		expect(result['a'].val).toBe(2)
	})

	it('returns empty object for null/undefined', () => {
		expect(mapArray(null, 'id')).toEqual({})
		expect(mapArray(undefined, 'id')).toEqual({})
	})

	it('returns empty object for empty array', () => {
		expect(mapArray([], 'id')).toEqual({})
	})

	it('throws if no key provided', () => {
		expect(() => mapArray([{ id: 'a' }], '' as never)).toThrow()
	})

	it('skips items with non-string keys', () => {
		const arr = [
			{ id: 'a', val: 1 },
			{ id: 42, val: 2 },
		] as Array<Record<string, unknown>>
		const result = mapArray(arr, 'id')
		expect(Object.keys(result)).toEqual(['a'])
	})
})

describe('mapArrays', () => {
	it('groups items by key', () => {
		const arr = [
			{ cat: 'x', val: 1 },
			{ cat: 'y', val: 2 },
			{ cat: 'x', val: 3 },
		]
		const result = mapArrays(arr, 'cat')
		expect(result['x']).toHaveLength(2)
		expect(result['y']).toHaveLength(1)
	})

	it('returns empty object for empty array', () => {
		expect(mapArrays([], 'id')).toEqual({})
	})

	it('preserves all items in groups', () => {
		const arr = [
			{ id: 'a', n: 1 },
			{ id: 'a', n: 2 },
			{ id: 'a', n: 3 },
		]
		const result = mapArrays(arr, 'id')
		expect(result['a']).toHaveLength(3)
		expect(result['a'].map((i) => i.n)).toEqual([1, 2, 3])
	})
})

describe('round', () => {
	it('rounds to 2 decimal places by default', () => {
		expect(round(3.13371)).toBe(3.13)
	})

	it('rounds to specified places', () => {
		expect(round(3.13371, 3)).toBe(3.133)
		expect(round(3.13371, 0)).toBe(3)
		expect(round(3.13371, 1)).toBe(3.1)
	})

	it('handles zero', () => {
		expect(round(0)).toBe(0)
	})

	it('handles negative numbers', () => {
		expect(round(-3.456, 1)).toBe(-3.5)
		expect(round(-3.546, 1)).toBe(-3.5)
	})

	it('handles whole numbers', () => {
		expect(round(5, 2)).toBe(5)
	})
})

describe('dateDiff', () => {
	it('calculates difference in days', () => {
		const diff = dateDiff('2025-01-01T00:00:00Z', '2025-01-11T00:00:00Z')
		expect(diff).toBeCloseTo(10, 1)
	})

	it('returns 0 for same date', () => {
		const date = '2025-01-01T12:00:00Z'
		expect(dateDiff(date, date)).toBe(0)
	})

	it('handles fractional days', () => {
		const diff = dateDiff('2025-01-01T00:00:00Z', '2025-01-01T12:00:00Z')
		expect(diff).toBeCloseTo(0.5, 2)
	})

	it('accepts Date objects', () => {
		const d1 = new Date('2025-01-01T00:00:00Z')
		const d2 = new Date('2025-01-06T00:00:00Z')
		expect(dateDiff(d1, d2)).toBeCloseTo(5, 1)
	})

	it('returns negative for reverse order', () => {
		const diff = dateDiff('2025-01-11T00:00:00Z', '2025-01-01T00:00:00Z')
		expect(diff).toBeCloseTo(-10, 1)
	})
})

describe('min0', () => {
	it('returns the number when positive', () => {
		expect(min0(5)).toBe(5)
	})

	it('returns 0 when negative', () => {
		expect(min0(-5)).toBe(0)
	})

	it('returns 0 for 0', () => {
		expect(min0(0)).toBe(0)
	})
})

describe('arrayUnion', () => {
	it('unions multiple arrays', () => {
		const result = arrayUnion([
			['a', 'b'],
			['b', 'c'],
			['c', 'd'],
		])
		expect(result.toSorted()).toEqual(['a', 'b', 'c', 'd'])
	})

	it('returns empty for empty arrays', () => {
		expect(arrayUnion([[], []])).toEqual([])
	})

	it('deduplicates within single array', () => {
		expect(arrayUnion([['a', 'a', 'b']])).toEqual(['a', 'b'])
	})
})

describe('arrayDifference', () => {
	it('returns items in first but not second', () => {
		const result = arrayDifference(['a', 'b', 'c', 'd'], [['b', 'c']])
		expect(result).toEqual(['a', 'd'])
	})

	it('handles multiple exclusion arrays', () => {
		const result = arrayDifference(['a', 'b', 'c', 'd'], [['b'], ['d']])
		expect(result).toEqual(['a', 'c'])
	})

	it('returns all when nothing to exclude', () => {
		const result = arrayDifference(['a', 'b'], [[]])
		expect(result).toEqual(['a', 'b'])
	})

	it('returns empty when all excluded', () => {
		const result = arrayDifference(['a', 'b'], [['a', 'b']])
		expect(result).toEqual([])
	})
})

describe('sortDecksByCreation', () => {
	it('sorts ascending by created_at', () => {
		const decks = [
			{ created_at: '2025-03-01', lang: 'hin' },
			{ created_at: '2025-01-01', lang: 'spa' },
			{ created_at: '2025-02-01', lang: 'tam' },
		]
		const sorted = [...decks].toSorted(sortDecksByCreation)
		expect(sorted[0].lang).toBe('spa')
		expect(sorted[1].lang).toBe('tam')
		expect(sorted[2].lang).toBe('hin')
	})

	it('falls back to lang for same created_at', () => {
		const decks = [
			{ created_at: '2025-01-01', lang: 'tam' },
			{ created_at: '2025-01-01', lang: 'hin' },
		]
		const sorted = [...decks].toSorted(sortDecksByCreation)
		expect(sorted[0].lang).toBe('hin')
		expect(sorted[1].lang).toBe('tam')
	})
})

describe('sortDecksByActivity', () => {
	const makeDeck = (
		overrides: Partial<{
			created_at: string
			most_recent_review_at: string | null
			lang: string
		}>
	) =>
		({
			created_at: '2025-01-01',
			most_recent_review_at: null,
			lang: 'hin',
			...overrides,
		}) as Parameters<typeof sortDecksByActivity>[0]

	it('sorts descending by most recent activity', () => {
		const decks = [
			makeDeck({ most_recent_review_at: '2025-01-01', lang: 'hin' }),
			makeDeck({ most_recent_review_at: '2025-03-01', lang: 'spa' }),
			makeDeck({ most_recent_review_at: '2025-02-01', lang: 'tam' }),
		]
		const sorted = [...decks].toSorted(sortDecksByActivity)
		expect(sorted[0].lang).toBe('spa')
		expect(sorted[1].lang).toBe('tam')
		expect(sorted[2].lang).toBe('hin')
	})

	it('falls back to created_at when no reviews', () => {
		const decks = [
			makeDeck({ created_at: '2025-01-01', lang: 'hin' }),
			makeDeck({ created_at: '2025-03-01', lang: 'spa' }),
		]
		const sorted = [...decks].toSorted(sortDecksByActivity)
		expect(sorted[0].lang).toBe('spa')
	})
})
