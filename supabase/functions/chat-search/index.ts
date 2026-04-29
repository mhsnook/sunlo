// Edge Function: chat-search
//
// Public, no-auth. Accepts a normalized chat search request, embeds the
// query via Cloudflare Workers AI (BGE-M3), and queries the chat_corpus
// via the chat_search / chat_anchor_search RPCs. Returns ChatResultPhrase
// shaped responses with translations attached.
//
// Required env vars (set in Supabase dashboard):
//   CLOUDFLARE_ACCOUNT_ID
//   CLOUDFLARE_API_TOKEN
//   SUPABASE_URL                  (built-in)
//   SUPABASE_SERVICE_ROLE_KEY     (built-in — used so we can read corpus
//                                  even without a user JWT; corpus is
//                                  public anyway, but service role bypasses
//                                  the RLS round-trip)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { normalize } from '../_shared/normalize.ts'

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers':
		'authorization, x-client-info, apikey, content-type',
}

type RequestBody = {
	lang: string
	excludePids: string[]
	query:
		| { kind: 'text'; text: string }
		| { kind: 'anchor'; pids: string[]; label?: string }
}

type CorpusMatch = {
	phrase_id: string
	matched_via: 'phrase' | 'translation'
	matched_text: string
	matched_lang: string
	similarity: number
}

const CF_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')!
const CF_API_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN')!

// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-injected by the deployed
// edge runtime, but `supabase functions serve` does NOT inject them locally
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

async function hydrateResults(matches: CorpusMatch[]) {
	if (matches.length === 0) return []

	const phraseIds = matches.map((m) => m.phrase_id)

	const [{ data: phrases }, { data: translations }] = await Promise.all([
		supabase
			.from('phrase')
			.select('id, text, lang, archived')
			.in('id', phraseIds)
			.eq('archived', false),
		supabase
			.from('phrase_translation')
			.select('id, phrase_id, text, lang, archived')
			.in('phrase_id', phraseIds)
			.eq('archived', false),
	])

	const phraseById = new Map((phrases ?? []).map((p) => [p.id, p]))
	const translationsByPhrase = new Map<
		string,
		Array<{ id: string; lang: string; text: string }>
	>()
	for (const t of translations ?? []) {
		const list = translationsByPhrase.get(t.phrase_id) ?? []
		list.push({ id: t.id, lang: t.lang, text: t.text })
		translationsByPhrase.set(t.phrase_id, list)
	}

	// Preserve RPC ordering (already sorted by similarity desc).
	return matches
		.map((m) => {
			const phrase = phraseById.get(m.phrase_id)
			if (!phrase) return null
			return {
				id: phrase.id,
				lang: phrase.lang,
				text: phrase.text,
				score: m.similarity,
				translations: translationsByPhrase.get(phrase.id) ?? [],
			}
		})
		.filter((x): x is NonNullable<typeof x> => x !== null)
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

	const lang = body.lang
	const excludePids = body.excludePids ?? []
	const matchLimit = 3

	try {
		let matches: CorpusMatch[]

		if (body.query.kind === 'text') {
			const normalized = normalize(lang, body.query.text)
			if (normalized.length < 2) {
				return new Response(JSON.stringify([]), {
					status: 200,
					headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
				})
			}

			const embedding = await embedViaWorkersAI(normalized)
			const { data, error } = await supabase.rpc('chat_search', {
				query_embedding: vectorToPgLiteral(embedding),
				target_lang: lang,
				exclude_pids: excludePids,
				match_limit: matchLimit,
			})

			if (error) throw error
			matches = (data ?? []) as CorpusMatch[]
		} else {
			const { data, error } = await supabase.rpc('chat_anchor_search', {
				anchor_pids: body.query.pids,
				target_lang: lang,
				exclude_pids: excludePids,
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
