// Edge Function: chat-search
//
// Public, no-auth. Accepts a search request, embeds the query via Cloudflare
// Workers AI (BGE-M3) for text mode (or computes a server-side anchor mean
// for anchor mode), then queries search_corpus via search_by_query /
// search_by_anchors RPCs. Returns mixed entity results — phrases (with
// translations attached), requests (with the prompt), and playlists (with
// title + description).
//
// Required env vars (set in Supabase dashboard):
//   CLOUDFLARE_ACCOUNT_ID
//   CLOUDFLARE_API_TOKEN
//   SUPABASE_URL                  (built-in in deployed runtime)
//   SUPABASE_SERVICE_ROLE_KEY     (built-in in deployed runtime)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
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

const CF_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')!
const CF_API_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN')!

// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-injected by the deployed
// edge runtime, but `supabase functions serve` doesn't inject them locally
// (and refuses to load any `SUPABASE_*` from supabase/functions/.env). Fall
// back to the unprefixed CHAT_* names so local dev can supply them via the
// functions .env file without colliding with the reserved prefix.
const SUPABASE_URL =
	Deno.env.get('SUPABASE_URL') ?? Deno.env.get('CHAT_SUPABASE_URL')
const SERVICE_ROLE_KEY =
	Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
	Deno.env.get('CHAT_SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
	throw new Error(
		'chat-search: missing Supabase URL or service-role key. Set SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY (production) or CHAT_SUPABASE_URL/CHAT_SERVICE_ROLE_KEY (local).'
	)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

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
	const data =
		json?.result?.data ?? json?.result?.response?.data ?? json?.response?.data
	const vec = Array.isArray(data?.[0]) ? data[0] : null
	if (!vec || vec.length === 0) {
		throw new Error(
			`Unexpected Workers AI response shape: ${JSON.stringify(json).slice(0, 200)}`
		)
	}
	return vec as number[]
}

function vectorToPgLiteral(vec: number[]): string {
	return `[${vec.join(',')}]`
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

	const [phraseRes, translationRes, requestRes, playlistRes] =
		await Promise.all([
			phraseIds.length
				? supabase
						.from('phrase')
						.select('id, text, lang, archived')
						.in('id', phraseIds)
						.eq('archived', false)
				: Promise.resolve({ data: [], error: null }),
			phraseIds.length
				? supabase
						.from('phrase_translation')
						.select('id, phrase_id, text, lang, archived')
						.in('phrase_id', phraseIds)
						.eq('archived', false)
				: Promise.resolve({ data: [], error: null }),
			requestIds.length
				? supabase
						.from('phrase_request')
						.select('id, prompt, lang, deleted')
						.in('id', requestIds)
						.eq('deleted', false)
				: Promise.resolve({ data: [], error: null }),
			playlistIds.length
				? supabase
						.from('phrase_playlist')
						.select('id, title, description, lang, deleted')
						.in('id', playlistIds)
						.eq('deleted', false)
				: Promise.resolve({ data: [], error: null }),
		])

	const phraseById = new Map(
		(phraseRes.data ?? []).map((p) => [
			p.id,
			p as { id: string; text: string; lang: string },
		])
	)
	const requestById = new Map(
		(requestRes.data ?? []).map((r) => [
			r.id,
			r as { id: string; prompt: string; lang: string },
		])
	)
	const playlistById = new Map(
		(playlistRes.data ?? []).map((p) => [
			p.id,
			p as {
				id: string
				title: string
				description: string | null
				lang: string
			},
		])
	)
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

			const embedding = await embedViaWorkersAI(normalized)
			const { data, error } = await supabase.rpc('search_by_query', {
				query_embedding: vectorToPgLiteral(embedding),
				target_langs: langs,
				exclude_ids: excludeIds,
				match_limit: matchLimit,
			})

			if (error) throw error
			matches = (data ?? []) as CorpusMatch[]
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
		console.error('chat-search error:', err)
		return new Response(
			JSON.stringify({ error: (err as Error).message ?? 'Internal error' }),
			{
				status: 500,
				headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
			}
		)
	}
})
