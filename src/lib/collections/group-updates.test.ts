import { describe, it, expect } from 'vitest'
import { groupUpdatesByChanges } from './group-updates'

type Mutation = {
	key: string
	changes: { status: string }
	original: { phrase_id: string }
}

const mutation = (key: string, status: string, phraseId: string): Mutation => ({
	key,
	changes: { status },
	original: { phrase_id: phraseId },
})

describe('groupUpdatesByChanges', () => {
	it('groups mutations that share a payload', () => {
		const groups = groupUpdatesByChanges([
			mutation('a', 'learned', 'p1'),
			mutation('b', 'learned', 'p2'),
			mutation('c', 'skipped', 'p1'),
		])
		expect(groups.map((g) => g.keys)).toEqual([['a', 'b'], ['c']])
	})

	it('splits a shared payload by scope', () => {
		const forward = mutation('f1', 'learned', 'p1')
		const reverse = mutation('r1', 'learned', 'p1')
		const other = mutation('f2', 'learned', 'p2')
		const groups = groupUpdatesByChanges(
			[forward, other, reverse],
			(m) => m.original.phrase_id
		)
		expect(groups).toEqual([
			{
				changes: { status: 'learned' },
				keys: ['f1', 'r1'],
				mutations: [forward, reverse],
			},
			{ changes: { status: 'learned' }, keys: ['f2'], mutations: [other] },
		])
	})

	it('keeps one scope apart when its payloads differ', () => {
		const groups = groupUpdatesByChanges(
			[mutation('f1', 'learned', 'p1'), mutation('r1', 'skipped', 'p1')],
			(m) => m.original.phrase_id
		)
		expect(groups.map((g) => g.keys)).toEqual([['f1'], ['r1']])
	})
})
