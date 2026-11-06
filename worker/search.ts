import type { SupabaseClient } from '@supabase/supabase-js'
import * as z from 'zod'
import { normalize } from '../src/features/chat/normalize'
import type { Database } from '../src/types/supabase'

type Sb = SupabaseClient<Database>

export type EmbedFn = (text: string) => Promise<Array<number>>

type EntityType = 'phrase' | 'request' | 'playlist'

export const SearchRequestSchema = z.object({
	// null searches every language.
	langs: z.array(z.string().length(3)).max(50).nullable(),
	excludeIds: z.array(z.string().uuid()).max(5000).default([]),
	query: z.discriminatedUnion('kind', [
		z.object({ kind: z.literal('text'), text: z.string().max(500) }),
		z.object({
			kind: z.literal('anchor'),
			ids: z.array(z.string().uuid()).min(1).max(500),
		}),
	]),
	limit: z.number().int().min(1).max(100).default(20),
})

export type SearchRequest = z.infer<typeof SearchRequestSchema>

export type CorpusMatch = {
	entity_type: EntityType
	entity_id: string
	matched_via: 'phrase' | 'translation' | 'request' | 'playlist'
	matched_text: string
	matched_lang: string
	similarity: number
}

export type SearchResult = {
	entity_type: EntityType
	entity_id: string
	lang: string
	text: string
	score: number
	translations: Array<{ id: string; lang: string; text: string }>
	description?: string | null
}

const MIN_NORMALIZED_LENGTH = 2

export function embedderFor(env: Pick<Env, 'AI' | 'AI_GATEWAY_ID'>): EmbedFn {
	return async (text) => {
		const output = await env.AI.run(
			'@cf/baai/bge-m3',
			{ text: [text] },
			{ gateway: { id: env.AI_GATEWAY_ID } }
		)
		const vector = 'data' in output ? output.data?.[0] : undefined
		if (!vector) throw new Error('bge-m3 returned no embedding')
		return vector
	}
}

const toPgVector = (vector: Array<number>) => `[${vector.join(',')}]`

// The corpus stores (text_normalized, embedding) pairs, and bge-m3 is
// deterministic, so an exact match is the same vector a fresh call returns.
// Keep the lookup even if the model call is cheap: `pnpm dev:local` and CI
// run without the AI binding, and there a cache hit is the only way a text
// query gets semantic results.
async function queryEmbedding(
	sb: Sb,
	embed: EmbedFn,
	normalized: string
): Promise<Array<number> | null> {
	const { data: cached } = await sb
		.from('search_corpus')
		.select('embedding')
		.eq('text_normalized', normalized)
		.limit(1)
		.maybeSingle()
	if (cached?.embedding) return JSON.parse(cached.embedding) as Array<number>
	try {
		return await embed(normalized)
	} catch (err) {
		console.warn('search: embedding failed, using trigram anchors', err)
		return null
	}
}

// Without an embedding, the closest spellings (trigram) become anchors, and
// search_by_anchors returns the meaning-neighbourhood of those anchors.
async function trigramAnchorMatches(
	sb: Sb,
	text: string,
	request: SearchRequest
): Promise<Array<CorpusMatch>> {
	const { data: hits } = await sb
		.rpc('search_by_trigram', {
			query: text,
			target_langs: request.langs ?? undefined,
			exclude_ids: request.excludeIds,
			match_limit: 8,
		})
		.throwOnError()
	if (!hits?.length) return []
	return anchorMatches(
		sb,
		hits.map((hit) => hit.entity_id),
		request
	)
}

async function anchorMatches(
	sb: Sb,
	anchorIds: Array<string>,
	request: SearchRequest
): Promise<Array<CorpusMatch>> {
	const { data } = await sb
		.rpc('search_by_anchors', {
			anchor_ids: anchorIds,
			target_langs: request.langs ?? undefined,
			exclude_ids: request.excludeIds,
			match_limit: request.limit,
		})
		.throwOnError()
	return (data ?? []) as Array<CorpusMatch>
}

/**
 * Entities ranked by similarity, without their text. The coach reads its
 * own columns, so it stops here; the app's search goes on to searchCorpus.
 */
export async function matchCorpus(
	sb: Sb,
	embed: EmbedFn,
	request: SearchRequest
): Promise<Array<CorpusMatch>> {
	if (request.query.kind === 'anchor')
		return anchorMatches(sb, request.query.ids, request)

	const { text } = request.query
	const normalized = normalize(request.langs?.[0] ?? 'eng', text)
	if (normalized.length < MIN_NORMALIZED_LENGTH) return []

	const embedding = await queryEmbedding(sb, embed, normalized)
	if (!embedding) return trigramAnchorMatches(sb, text, request)

	const { data } = await sb
		.rpc('search_by_query', {
			query_embedding: toPgVector(embedding),
			target_langs: request.langs ?? undefined,
			exclude_ids: request.excludeIds,
			match_limit: request.limit,
		})
		.throwOnError()
	return (data ?? []) as Array<CorpusMatch>
}

async function hydrate(
	sb: Sb,
	matches: Array<CorpusMatch>
): Promise<Array<SearchResult>> {
	if (!matches.length) return []
	const idsOf = (type: EntityType) =>
		matches.filter((m) => m.entity_type === type).map((m) => m.entity_id)
	const phraseIds = idsOf('phrase')
	const requestIds = idsOf('request')
	const playlistIds = idsOf('playlist')

	// The RPCs already drop archived and deleted entities. Translations are
	// not entities there, so they filter `archived` here.
	const [phrases, translations, requests, playlists] = await Promise.all([
		phraseIds.length
			? sb
					.from('phrase')
					.select('id, text, lang')
					.in('id', phraseIds)
					.throwOnError()
			: { data: [] },
		phraseIds.length
			? sb
					.from('phrase_translation')
					.select('id, phrase_id, text, lang')
					.in('phrase_id', phraseIds)
					.eq('archived', false)
					.throwOnError()
			: { data: [] },
		requestIds.length
			? sb
					.from('phrase_request')
					.select('id, prompt, lang')
					.in('id', requestIds)
					.throwOnError()
			: { data: [] },
		playlistIds.length
			? sb
					.from('phrase_playlist')
					.select('id, title, description, lang')
					.in('id', playlistIds)
					.throwOnError()
			: { data: [] },
	])

	const phraseById = new Map((phrases.data ?? []).map((p) => [p.id, p]))
	const requestById = new Map((requests.data ?? []).map((r) => [r.id, r]))
	const playlistById = new Map((playlists.data ?? []).map((p) => [p.id, p]))
	const translationsByPhrase = new Map<
		string,
		Array<{ id: string; lang: string; text: string }>
	>()
	for (const t of translations.data ?? []) {
		const list = translationsByPhrase.get(t.phrase_id) ?? []
		list.push({ id: t.id, lang: t.lang, text: t.text })
		translationsByPhrase.set(t.phrase_id, list)
	}

	return matches.flatMap((m): Array<SearchResult> => {
		if (m.entity_type === 'phrase') {
			const phrase = phraseById.get(m.entity_id)
			if (!phrase) return []
			return [
				{
					entity_type: 'phrase',
					entity_id: phrase.id,
					lang: phrase.lang,
					text: phrase.text,
					score: m.similarity,
					translations: translationsByPhrase.get(phrase.id) ?? [],
				},
			]
		}
		if (m.entity_type === 'request') {
			const request = requestById.get(m.entity_id)
			if (!request) return []
			return [
				{
					entity_type: 'request',
					entity_id: request.id,
					lang: request.lang,
					text: request.prompt,
					score: m.similarity,
					translations: [],
				},
			]
		}
		const playlist = playlistById.get(m.entity_id)
		if (!playlist) return []
		return [
			{
				entity_type: 'playlist',
				entity_id: playlist.id,
				lang: playlist.lang,
				text: playlist.title,
				description: playlist.description,
				score: m.similarity,
				translations: [],
			},
		]
	})
}

/** Ranked phrases, requests and playlists, with their text, best first. */
export async function searchCorpus(
	sb: Sb,
	embed: EmbedFn,
	request: SearchRequest
): Promise<Array<SearchResult>> {
	return hydrate(sb, await matchCorpus(sb, embed, request))
}
