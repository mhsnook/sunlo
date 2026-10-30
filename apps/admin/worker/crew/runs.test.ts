import { describe, expect, it } from 'vitest'
import { mainRunPosted, runEdits, type EditRow } from './runs'

// product-1's main run starts at T0; a side-thread run for it starts at T1,
// while the main run is still going. Each makes edits after T1.
const T0 = '2026-10-30T10:00:00.000Z'
const T1 = '2026-10-30T10:01:00.000Z'
const THREAD = 'mhw1-abcd1234'

const edits: Array<EditRow> = [
	{
		run: null,
		what: 'edited earlier main run',
		at: '2026-10-30T09:00:00.000Z',
	},
	{ run: null, what: 'added to-do "Ship it"', at: '2026-10-30T10:00:30.000Z' },
	{
		run: THREAD,
		what: 'saved memory "A fact"',
		at: '2026-10-30T10:01:10.000Z',
	},
	{ run: null, what: 'closed item 4', at: '2026-10-30T10:01:20.000Z' },
	{
		run: 'other-thread',
		what: 'forgot memory 2',
		at: '2026-10-30T10:01:30.000Z',
	},
]

describe('runEdits', () => {
	it("lists only the main run's edits since it started", () => {
		expect(runEdits(edits, { thread: null, since: T0 })).toEqual([
			'added to-do "Ship it"',
			'closed item 4',
		])
	})

	it("lists only the side-thread run's edits, not the main run's after it started", () => {
		expect(runEdits(edits, { thread: THREAD, since: T1 })).toEqual([
			'saved memory "A fact"',
		])
	})

	it('puts the edits in the order they were made', () => {
		const shuffled = [edits[3], edits[1]]
		expect(runEdits(shuffled, { thread: null, since: T0 })).toEqual([
			'added to-do "Ship it"',
			'closed item 4',
		])
	})
})

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
