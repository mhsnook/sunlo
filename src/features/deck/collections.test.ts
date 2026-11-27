import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { cardsCollection } from './collections'
import type { CardType } from './schemas'

const server = vi.hoisted(() => {
	type Row = Record<string, unknown>
	type Filter = [column: string, value: unknown]
	const state = {
		cards: [] as Array<Row>,
		updates: [] as Array<{ changes: Row; filters: Array<Filter> }>,
	}
	const from = (table: string) => {
		if (table !== 'user_card') throw new Error(`unexpected table ${table}`)
		return {
			select: () => ({
				throwOnError: () =>
					Promise.resolve({
						data: state.cards.map((row) => structuredClone(row)),
					}),
			}),
			update: (changes: Row) => {
				const filters: Array<Filter> = []
				const query = {
					eq: (column: string, value: unknown) => {
						filters.push([column, value])
						return query
					},
					select: () => ({
						throwOnError: () => {
							state.updates.push({ changes, filters })
							const matched = state.cards.filter((row) =>
								filters.every(([column, value]) => row[column] === value)
							)
							for (const row of matched) Object.assign(row, changes)
							return Promise.resolve({
								data: matched.map((row) => structuredClone(row)),
							})
						},
					}),
				}
				return query
			},
		}
	}
	const client = {
		from,
		auth: {
			getSession: () => Promise.resolve({ data: { session: {} } }),
		},
	}
	return { state, client }
})

vi.mock('@/lib/supabase-client', () => ({ default: server.client }))

const uid = crypto.randomUUID()
const nowIso = new Date().toISOString()
const makeCard = (
	phraseId: string,
	direction: CardType['direction']
): CardType => ({
	id: crypto.randomUUID(),
	uid,
	phrase_id: phraseId,
	lang: 'hin',
	status: 'active',
	direction,
	created_at: nowIso,
	updated_at: nowIso,
})
const makePhrase = () => {
	const phraseId = crypto.randomUUID()
	return {
		phraseId,
		forward: makeCard(phraseId, 'forward'),
		reverse: makeCard(phraseId, 'reverse'),
	}
}

const both = makePhrase()
const single = makePhrase()
const unsaved = makePhrase()

const serverCard = (id: string) =>
	server.state.cards.find((row) => row.id === id)

beforeAll(async () => {
	server.state.cards = [both, single].flatMap((phrase) => [
		{ ...phrase.forward },
		{ ...phrase.reverse },
	])
	await cardsCollection.preload()
	await cardsCollection.utils.writeInsert([unsaved.forward, unsaved.reverse])
})

beforeEach(() => {
	server.state.updates.length = 0
})

describe('cardsCollection.onUpdate', () => {
	it('updates both directions of a phrase in one request filtered on the phrase', async () => {
		const tx = cardsCollection.update(
			[both.forward.id, both.reverse.id],
			(drafts) => {
				drafts.forEach((draft) => {
					draft.status = 'learned'
				})
			}
		)
		await tx.when('settled')
		expect(server.state.updates).toEqual([
			{
				changes: { status: 'learned' },
				filters: [
					['uid', uid],
					['phrase_id', both.phraseId],
				],
			},
		])
		expect(cardsCollection.get(both.forward.id)?.status).toBe('learned')
		expect(cardsCollection.get(both.reverse.id)?.status).toBe('learned')
	})

	it('updates one direction by id and leaves its sibling alone', async () => {
		const tx = cardsCollection.update(single.forward.id, (draft) => {
			draft.status = 'skipped'
		})
		await tx.when('settled')
		expect(server.state.updates).toEqual([
			{
				changes: { status: 'skipped' },
				filters: [['id', single.forward.id]],
			},
		])
		expect(serverCard(single.reverse.id)?.status).toBe('active')
		expect(cardsCollection.get(single.forward.id)?.status).toBe('skipped')
		expect(cardsCollection.get(single.reverse.id)?.status).toBe('active')
	})

	it('rolls back when the server has no row to update', async () => {
		const tx = cardsCollection.update(
			[unsaved.forward.id, unsaved.reverse.id],
			(drafts) => {
				drafts.forEach((draft) => {
					draft.status = 'learned'
				})
			}
		)
		await expect(tx.when('settled')).rejects.toThrow(/matched no server row/)
		expect(server.state.updates).toHaveLength(1)
		expect(cardsCollection.get(unsaved.forward.id)?.status).toBe('active')
		expect(cardsCollection.get(unsaved.reverse.id)?.status).toBe('active')
	})
})
