// Edge Function: chat-search
//
// Public, no-auth. Accepts a normalized search request, embeds the query via
// Cloudflare Workers AI (BGE-M3) for text mode, then queries the search_corpus
// via search_by_query / search_by_anchors RPCs. Returns mixed entity results
// (phrases with translations attached + requests).
//
// Backwards-compat: still accepts the older `lang` / `excludePids` / `pids`
// body shape from the chat client on `next`. New callers should use `langs`
// (string[] | null), `excludeIds`, and `ids` for anchors.
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

type RequestBody = {
	// New multi-lang shape; pass null to skip lang filtering.
	langs?: string[] | null
	// Legacy single-lang shape (chat client on next).
	lang?: string

	excludeIds?: string[]
	excludePids?: string[] // legacy

	query:
		| { kind: 'text'; text: string }
		| { kind: 'anchor'; ids?: string[]; pids?: string[]; label?: string }

	// Optional override for top-K. Defaults to 3 (chat) or 20 (search).
	limit?: number
}

type CorpusMatch = {
	entity_type: 'phrase' | 'request'
	entity_id: string
	matched_via: 'phrase' | 'translation' | 'request'
	matched_text: string
	matched_lang: string
	similarity: number
}

type SearchResult = {
	entity_type: 'phrase' | 'request'
	entity_id: string
	lang: string
	text: string
	score: number
	translations: Array<{ id: string; lang: string; text: string }>
	// Backwards-compat for the chat client which expects `id` (phrase id) at
	// the root and translations attached. Set to entity_id; chat results are
	// always phrases at the moment.
	id: string
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

	// BGE-M3 has shipped under multiple response shapes across Workers AI
	// revisions; accept either flat embedding or wrapped payload.
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

	const [phraseRes, translationRes, requestRes] = await Promise.all([
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
					id: phrase.id,
					lang: phrase.lang,
					text: phrase.text,
					score: m.similarity,
					translations: translationsByPhrase.get(phrase.id) ?? [],
				}
			}
			const request = requestById.get(m.entity_id)
			if (!request) return null
			return {
				entity_type: 'request',
				entity_id: request.id,
				id: request.id,
				lang: request.lang,
				text: request.prompt,
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

	// Normalize legacy fields. langs=null means "search across all langs".
	const langs: string[] | null =
		body.langs !== undefined ? body.langs : body.lang ? [body.lang] : null
	const excludeIds: string[] = body.excludeIds ?? body.excludePids ?? []
	const matchLimit = body.limit ?? 3
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
			const anchorIds = body.query.ids ?? body.query.pids ?? []
			const { data, error } = await supabase.rpc('search_by_anchors', {
				anchor_ids: anchorIds,
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
