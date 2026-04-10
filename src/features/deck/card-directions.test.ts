import { describe, it, expect } from 'vitest'
import { directionsForPhrase } from '@/features/deck/card-directions'

describe('directionsForPhrase', () => {
	it('returns both directions for normal phrases', () => {
		expect(directionsForPhrase(false)).toEqual(['forward', 'reverse'])
	})

	it('returns only reverse for only_reverse phrases', () => {
		expect(directionsForPhrase(true)).toEqual(['reverse'])
	})

	it('treats null as normal (both directions)', () => {
		expect(directionsForPhrase(null)).toEqual(['forward', 'reverse'])
	})

	it('treats undefined as normal (both directions)', () => {
		expect(directionsForPhrase(undefined)).toEqual(['forward', 'reverse'])
	})
})
