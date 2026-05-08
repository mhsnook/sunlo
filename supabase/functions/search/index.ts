// Edge Function: search
//
// Public, no-auth. Accepts a search request, embeds the query via Cloudflare
// Workers AI (BGE-M3) for text mode (or computes a server-side anchor mean
// for anchor mode), then queries search_corpus via search_by_query /
// search_by_anchors RPCs. Returns mixed entity results — phrases (with
// translations attached), requests (with the prompt), and playlists (with
// title + description).
//
// Required env vars (auto-injected by both `supabase functions serve` and
// the deployed runtime):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Set in Supabase dashboard (deploy) and supabase/functions/.env (local):
//   CLOUDFLARE_ACCOUNT_ID
//   CLOUDFLARE_API_TOKEN

import { createClient } from '@supabase/supabase-js'
import { normalize } from '../_shared/normalize.ts'

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers':
		'authorization, x-client-info, apikey, content-type',
}

type EntityType = 'phrase' | 'request' | 'playlist'

type RequestBody = {
	// null = no lang filter; array = filter to those entity_langs.
	langs: string[] | null
	excludeIds: string[]
	query: { kind: 'text'; text: string } | { kind: 'anchor'; ids: string[] }
	limit?: number
}

type CorpusMatch = {
	entity_type: EntityType
	entity_id: string
	matched_via: 'phrase' | 'translation' | 'request' | 'playlist'
	matched_text: string
	matched_lang: string
	similarity: number
}

type SearchResult = {
	entity_type: EntityType
	entity_id: string
	lang: string
	text: string
	score: number
	translations: Array<{ id: string; lang: string; text: string }>
	// Playlists only: include description as a separate field for UI.
	description?: string | null
}

const CF_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')
const CF_API_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN')
const HAS_WORKERS_AI = Boolean(CF_ACCOUNT_ID && CF_API_TOKEN)

if (!HAS_WORKERS_AI) {
	console.log(
		'[search] Workers AI keys not configured — text queries will use trigram-anchor fallback (corpus-vector lookup, then top trigram hits as anchors for search_by_anchors)'
	)
}

const supabase = createClient(
	Deno.env.get('SUPABASE_URL')!,
	Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

async function embedViaWorkersAI(text: string): Promise<number[]> {
	const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/baai/bge-m3`
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${CF_API_TOKEN}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ text: [text] }),
	})

	if (!res.ok) {
		const body = await res.text()
		throw new Error(`Workers AI embedding failed: ${res.status} ${body}`)
	}

	const json = await res.json()
	return json.result.data[0] as number[]
}

function vectorToPgLiteral(vec: number[]): string {
	return `[${vec.join(',')}]`
}

// Try to obtain a query embedding without calling Workers AI when we can.
// The corpus already has (text_normalized, embedding) pairs for everything
// indexed, and BGE-M3 is deterministic, so an exact-match cache hit yields
// the same embedding we'd compute fresh. Lookup is O(log n) via
// search_corpus_text_normalized_idx.
//
// Returns null when (a) no cache hit AND (b) Workers AI keys are not
// configured. The caller falls back to trigram-anchor search in that case.
//
// GOTCHAS — re-evaluate before relying on the cache in production:
//
// (1) Topology assumption. This optimization is only worthwhile when the
//     Edge Function and the database are colocated. Today both live in
//     Supabase's region, so the cache lookup is cheap. If we move the
//     API to a different host (CF Pages function calling Supabase over
//     the public internet — see #606), the lookup hop may cost more
//     than the embedding call it's trying to save. Profile + reconsider
//     when the deployment shape changes.
//
// (2) Hit rate is uncertain. Cache hits when the user's normalized query
//     exactly matches indexed text — common for "let's go" or literal
//     phrase strings; rare for free-form questions. We don't know yet
//     whether the hit rate justifies the second round-trip on misses.
//     If it doesn't, delete this and call embedViaWorkersAI directly.
async function tryGetEmbedding(normalized: string): Promise<number[] | null> {
	const { data: cached } = await supabase
		.from('search_corpus')
		.select('embedding')
		.eq('text_normalized', normalized)
		.limit(1)
		.maybeSingle()

	if (cached?.embedding) return JSON.parse(cached.embedding) as number[]
	if (!HAS_WORKERS_AI) return null
	return embedViaWorkersAI(normalized)
}

// Trigram-anchor fallback. Used when Workers AI is unavailable AND the
// query has no exact-match cache hit. Runs a trigram match against the
// search_text_index materialized view to surface the lexically-closest
// indexed entities, then feeds their entity_ids into search_by_anchors —
// which averages those entities' corpus vectors and runs cosine similarity
// against the rest of search_corpus.
//
// Effect: lexical hits anchor a small semantic neighborhood, and that
// neighborhood is what gets returned. For a real query ("greetings") this
// behaves close to true semantic search. For garbage input ("sdfsfdg"),
// trigram still picks *something*, the anchors get a fuzzy centroid, and
// the result is plausible-shaped randomness — which is the desired UX in
// dev/demo modes without paid embedding calls.
//
// Returns [] if trigram finds nothing or if none of the matched entities
// have corpus vectors yet (search_by_anchors handles the latter by
// returning empty when the centroid is null).
async function searchViaTrigramAnchor(
	queryText: string,
	langs: string[] | null,
	excludeIds: string[],
	matchLimit: number
): Promise<CorpusMatch[]> {
	const { data: trigramHits, error: trigramErr } = await supabase.rpc(
		'search_by_trigram',
		{
			query: queryText,
			target_langs: langs,
			exclude_ids: excludeIds,
			match_limit: 8,
		}
	)
	if (trigramErr) throw trigramErr
	if (!trigramHits?.length) return []

	const anchorIds = (trigramHits as Array<{ entity_id: string }>).map(
		(h) => h.entity_id
	)

	const { data, error } = await supabase.rpc('search_by_anchors', {
		anchor_ids: anchorIds,
		target_langs: langs,
		exclude_ids: excludeIds,
		match_limit: matchLimit,
	})
	if (error) throw error
	return (data ?? []) as CorpusMatch[]
}

async function hydrateResults(matches: CorpusMatch[]): Promise<SearchResult[]> {
	if (matches.length === 0) return []

	const phraseIds = matches
		.filter((m) => m.entity_type === 'phrase')
		.map((m) => m.entity_id)
	const requestIds = matches
		.filter((m) => m.entity_type === 'request')
		.map((m) => m.entity_id)
	const playlistIds = matches
		.filter((m) => m.entity_type === 'playlist')
		.map((m) => m.entity_id)

	// The RPC has already filtered to non-archived / non-deleted entities,
	// so these hydration queries don't repeat the filter. Translations are
	// the exception — they're filtered separately because the RPC matches
	// on parent phrases, not translation rows.
	const [phraseRes, translationRes, requestRes, playlistRes] =
		await Promise.all([
			phraseIds.length
				? supabase.from('phrase').select('id, text, lang').in('id', phraseIds)
				: Promise.resolve({ data: [], error: null }),
			phraseIds.length
				? supabase
						.from('phrase_translation')
						.select('id, phrase_id, text, lang')
						.in('phrase_id', phraseIds)
						.eq('archived', false)
				: Promise.resolve({ data: [], error: null }),
			requestIds.length
				? supabase
						.from('phrase_request')
						.select('id, prompt, lang')
						.in('id', requestIds)
				: Promise.resolve({ data: [], error: null }),
			playlistIds.length
				? supabase
						.from('phrase_playlist')
						.select('id, title, description, lang')
						.in('id', playlistIds)
				: Promise.resolve({ data: [], error: null }),
		])

	const phraseById = new Map((phraseRes.data ?? []).map((p) => [p.id, p]))
	const requestById = new Map((requestRes.data ?? []).map((r) => [r.id, r]))
	const playlistById = new Map((playlistRes.data ?? []).map((p) => [p.id, p]))
	const translationsByPhrase = new Map<
		string,
		Array<{ id: string; lang: string; text: string }>
	>()
	for (const t of translationRes.data ?? []) {
		const list = translationsByPhrase.get(t.phrase_id) ?? []
		list.push({ id: t.id, lang: t.lang, text: t.text })
		translationsByPhrase.set(t.phrase_id, list)
	}

	// Preserve RPC ordering (already sorted by similarity desc).
	return matches
		.map((m): SearchResult | null => {
			if (m.entity_type === 'phrase') {
				const phrase = phraseById.get(m.entity_id)
				if (!phrase) return null
				return {
					entity_type: 'phrase',
					entity_id: phrase.id,
					lang: phrase.lang,
					text: phrase.text,
					score: m.similarity,
					translations: translationsByPhrase.get(phrase.id) ?? [],
				}
			}
			if (m.entity_type === 'request') {
				const request = requestById.get(m.entity_id)
				if (!request) return null
				return {
					entity_type: 'request',
					entity_id: request.id,
					lang: request.lang,
					text: request.prompt,
					score: m.similarity,
					translations: [],
				}
			}
			const playlist = playlistById.get(m.entity_id)
			if (!playlist) return null
			return {
				entity_type: 'playlist',
				entity_id: playlist.id,
				lang: playlist.lang,
				text: playlist.title,
				description: playlist.description,
				score: m.similarity,
				translations: [],
			}
		})
		.filter((x): x is SearchResult => x !== null)
}

Deno.serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: CORS_HEADERS })
	}

	if (req.method !== 'POST') {
		return new Response('Method not allowed', {
			status: 405,
			headers: CORS_HEADERS,
		})
	}

	let body: RequestBody
	try {
		body = await req.json()
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
			status: 400,
			headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
		})
	}

	const langs = body.langs ?? null
	const excludeIds = body.excludeIds ?? []
	const matchLimit = body.limit ?? 20
	const normalizeLang = langs?.[0] ?? 'eng'

	try {
		let matches: CorpusMatch[]

		if (body.query.kind === 'text') {
			const normalized = normalize(normalizeLang, body.query.text)
			if (normalized.length < 2) {
				return new Response(JSON.stringify([]), {
					status: 200,
					headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
				})
			}

			const embedding = await tryGetEmbedding(normalized)
			if (embedding) {
				const { data, error } = await supabase.rpc('search_by_query', {
					query_embedding: vectorToPgLiteral(embedding),
					target_langs: langs,
					exclude_ids: excludeIds,
					match_limit: matchLimit,
				})
				if (error) throw error
				matches = (data ?? []) as CorpusMatch[]
			} else {
				matches = await searchViaTrigramAnchor(
					body.query.text,
					langs,
					excludeIds,
					matchLimit
				)
			}
		} else {
			const { data, error } = await supabase.rpc('search_by_anchors', {
				anchor_ids: body.query.ids,
				target_langs: langs,
				exclude_ids: excludeIds,
				match_limit: matchLimit,
			})

			if (error) throw error
			matches = (data ?? []) as CorpusMatch[]
		}

		const results = await hydrateResults(matches)

		return new Response(JSON.stringify(results), {
			status: 200,
			headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
		})
	} catch (err) {
		console.error('search error:', err)
		return new Response(
			JSON.stringify({ error: (err as Error).message ?? 'Internal error' }),
			{
				status: 500,
				headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
			}
		)
	}
})
