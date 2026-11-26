import { describe, expect, it } from 'vitest'
import { mainRunPosted, settledStatus } from './runs'

const THREAD = 'mhw1-abcd1234'

describe('mainRunPosted', () => {
	it('counts a post in a room', () => {
		expect(
			mainRunPosted('product-1', [{ place: 'room:product', threadAsker: null }])
		).toBe(true)
	})

	it('does not count a reply in a side-thread the agent was asked in', () => {
		expect(
			mainRunPosted('product-1', [
				{ place: `thread:${THREAD}`, threadAsker: 'command-1' },
			])
		).toBe(false)
		expect(mainRunPosted('product-1', [])).toBe(false)
	})

	it('counts a reply in a side-thread the agent asked in', () => {
		expect(
			mainRunPosted('product-1', [
				{ place: `thread:${THREAD}`, threadAsker: 'product-1' },
			])
		).toBe(true)
	})
})

describe('settledStatus', () => {
	const T1 = '2026-10-30T10:01:00.000Z'
	const T3 = '2026-10-30T10:03:00.000Z'

	it('shows working since the first running run started', () => {
		expect(settledStatus({ state: 'idle', since: T1 }, T1, T3)).toEqual({
			state: 'working',
			since: T1,
		})
		expect(settledStatus(undefined, T1, T3)).toEqual({
			state: 'working',
			since: T1,
		})
	})

	it('moves the start to the run still going when the first one ends', () => {
		expect(
			settledStatus(
				{ state: 'working', since: '2026-10-30T09:00:00.000Z' },
				T1,
				T3
			)
		).toEqual({ state: 'working', since: T1 })
	})

	it('goes idle when no run is going', () => {
		expect(settledStatus({ state: 'working', since: T1 }, null, T3)).toEqual({
			state: 'idle',
			since: T3,
		})
	})

	it('changes nothing when the status already shows the runs', () => {
		expect(settledStatus({ state: 'working', since: T1 }, T1, T3)).toBeNull()
		expect(settledStatus({ state: 'idle', since: T1 }, null, T3)).toBeNull()
	})
})
