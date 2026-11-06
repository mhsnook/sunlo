import { describe, expect, it, vi } from 'vitest'
import {
	SearchRequestSchema,
	embedderFor,
	matchCorpus,
	searchCorpus,
	type CorpusMatch,
	type EmbedFn,
} from './search'

type Sb = Parameters<typeof matchCorpus>[0]

const PHRASE = '11111111-1111-4111-8111-111111111111'
const PLAYLIST = '22222222-2222-4222-8222-222222222222'
const ANCHOR = '33333333-3333-4333-8333-333333333333'

const match = (
	entity_type: CorpusMatch['entity_type'],
	entity_id: string,
	similarity: number
): CorpusMatch => ({
	entity_type,
	entity_id,
	matched_via: entity_type,
	matched_text: '',
	matched_lang: 'hin',
	similarity,
})

// Enough of the supabase-js query builder for worker/search.ts: every
// filter returns the builder, and each query ends in throwOnError() or
// maybeSingle(), which resolve to the table's rows.
function fakeSupabase(
	options: {
		cached?: Array<number>
		rpc?: Record<string, Array<unknown>>
		tables?: Record<string, Array<unknown>>
	} = {}
) {
	const rpcCalls: Array<[string, Record<string, unknown>]> = []
	const from = (table: string) => {
		const builder = {
			select: () => builder,
			eq: () => builder,
			in: () => builder,
			limit: () => builder,
			throwOnError: () =>
				Promise.resolve({ data: options.tables?.[table] ?? [] }),
			maybeSingle: () =>
				Promise.resolve({
					data:
						table === 'search_corpus' && options.cached
							? { embedding: JSON.stringify(options.cached) }
							: null,
				}),
		}
		return builder
	}
	const rpc = (name: string, args: Record<string, unknown>) => {
		rpcCalls.push([name, args])
		return {
			throwOnError: () => Promise.resolve({ data: options.rpc?.[name] ?? [] }),
		}
	}
	return { sb: { from, rpc } as unknown as Sb, rpcCalls }
}

const request = (body: unknown) => SearchRequestSchema.parse(body)
const textQuery = (text: string, langs: Array<string> | null = ['hin']) =>
	request({ langs, query: { kind: 'text', text } })

describe('matchCorpus', () => {
	it('embeds the normalized text and ranks by the vector', async () => {
		const { sb, rpcCalls } = fakeSupabase({
			rpc: { search_by_query: [match('phrase', PHRASE, 0.9)] },
		})
		const embed = vi.fn<EmbedFn>().mockResolvedValue([0.1, 0.2])
		const matches = await matchCorpus(sb, embed, textQuery('  Namasté! '))
		expect(embed).toHaveBeenCalledWith('namaste')
		expect(rpcCalls).toEqual([
			[
				'search_by_query',
				{
					query_embedding: '[0.1,0.2]',
					target_langs: ['hin'],
					exclude_ids: [],
					match_limit: 20,
				},
			],
		])
		expect(matches.map((m) => m.entity_id)).toEqual([PHRASE])
	})

	it('uses a cached corpus vector without calling the model', async () => {
		const { sb, rpcCalls } = fakeSupabase({ cached: [0.5, 0.5] })
		const embed = vi.fn<EmbedFn>()
		await matchCorpus(sb, embed, textQuery('namaste'))
		expect(embed).not.toHaveBeenCalled()
		expect(rpcCalls[0][1].query_embedding).toBe('[0.5,0.5]')
	})

	it('falls back to trigram anchors when the model call fails', async () => {
		const { sb, rpcCalls } = fakeSupabase({
			rpc: {
				search_by_trigram: [{ entity_id: ANCHOR }],
				search_by_anchors: [match('phrase', PHRASE, 0.7)],
			},
		})
		const embed = vi.fn<EmbedFn>().mockRejectedValue(new Error('no binding'))
		vi.spyOn(console, 'warn').mockImplementation(() => {})
		const matches = await matchCorpus(sb, embed, textQuery('Namaste'))
		expect(rpcCalls.map(([name]) => name)).toEqual([
			'search_by_trigram',
			'search_by_anchors',
		])
		expect(rpcCalls[0][1].query).toBe('Namaste')
		expect(rpcCalls[1][1].anchor_ids).toEqual([ANCHOR])
		expect(matches.map((m) => m.entity_id)).toEqual([PHRASE])
	})

	it('returns nothing for a query too short to search', async () => {
		const { sb, rpcCalls } = fakeSupabase()
		const embed = vi.fn<EmbedFn>()
		expect(await matchCorpus(sb, embed, textQuery(' ! a '))).toEqual([])
		expect(embed).not.toHaveBeenCalled()
		expect(rpcCalls).toEqual([])
	})

	it('averages anchors in the database without calling the model', async () => {
		const { sb, rpcCalls } = fakeSupabase()
		const embed = vi.fn<EmbedFn>()
		await matchCorpus(
			sb,
			embed,
			request({
				langs: null,
				query: { kind: 'anchor', ids: [ANCHOR] },
				excludeIds: [ANCHOR],
				limit: 40,
			})
		)
		expect(embed).not.toHaveBeenCalled()
		expect(rpcCalls).toEqual([
			[
				'search_by_anchors',
				{
					anchor_ids: [ANCHOR],
					target_langs: undefined,
					exclude_ids: [ANCHOR],
					match_limit: 40,
				},
			],
		])
	})
})

describe('searchCorpus', () => {
	it('adds text and translations, in ranked order, and drops missing rows', async () => {
		const missing = '44444444-4444-4444-8444-444444444444'
		const { sb } = fakeSupabase({
			rpc: {
				search_by_query: [
					match('playlist', PLAYLIST, 0.95),
					match('phrase', missing, 0.9),
					match('phrase', PHRASE, 0.8),
				],
			},
			tables: {
				phrase: [{ id: PHRASE, text: 'नमस्ते', lang: 'hin' }],
				phrase_translation: [
					{ id: 't1', phrase_id: PHRASE, text: 'hello', lang: 'eng' },
				],
				phrase_playlist: [
					{ id: PLAYLIST, title: 'Greetings', description: null, lang: 'hin' },
				],
			},
		})
		const results = await searchCorpus(
			sb,
			() => Promise.resolve([1]),
			textQuery('greetings')
		)
		expect(results).toEqual([
			{
				entity_type: 'playlist',
				entity_id: PLAYLIST,
				lang: 'hin',
				text: 'Greetings',
				description: null,
				score: 0.95,
				translations: [],
			},
			{
				entity_type: 'phrase',
				entity_id: PHRASE,
				lang: 'hin',
				text: 'नमस्ते',
				score: 0.8,
				translations: [{ id: 't1', lang: 'eng', text: 'hello' }],
			},
		])
	})
})

describe('embedderFor', () => {
	it('runs bge-m3 through the AI Gateway', async () => {
		const run = vi.fn().mockResolvedValue({ data: [[0.3, 0.4]], shape: [1, 2] })
		const env = { AI: { run }, AI_GATEWAY_ID: 'sunlo-app' } as unknown as Env
		expect(await embedderFor(env)('namaste')).toEqual([0.3, 0.4])
		expect(run).toHaveBeenCalledWith(
			'@cf/baai/bge-m3',
			{ text: ['namaste'] },
			{ gateway: { id: 'sunlo-app' } }
		)
	})

	it('throws when the model returns no vector', async () => {
		const run = vi.fn().mockResolvedValue({ request_id: 'queued' })
		const env = { AI: { run }, AI_GATEWAY_ID: 'sunlo-app' } as unknown as Env
		await expect(embedderFor(env)('namaste')).rejects.toThrow('no embedding')
	})
})
