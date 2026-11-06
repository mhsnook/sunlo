// Edge Function: embed-corpus-row
//
// Called by Postgres triggers (via pg_net) whenever a phrase /
// phrase_translation / phrase_request / phrase_playlist / phrase_tag row
// changes. Loads the source, computes the BGE-M3 embedding via Cloudflare
// Workers AI, and upserts a row into search_corpus. If the source is no
// longer visible (archived / deleted / missing), removes the
// corresponding corpus row instead.
//
// The trigger fires async — it doesn't block the source-table write.
// Eventual consistency: corpus lags source-table writes by ~hundreds of
// ms while the embedding is computed.
//
// Auth: verify_jwt = true (set in supabase/config.toml) gates every
// request through Supabase's JWT verification. We additionally require
// role = 'authenticated' in the claims, which restricts callers to
// real logged-in users — anon JWTs and service-role JWTs are rejected.
// The trigger forwards the calling user's auth header from the
// PostgREST session, which always has role=authenticated because RLS
// on the source tables blocks anon writes.
//
// It reads the source rows with the anon key, which sees exactly the
// rows that belong in the corpus, and writes search_corpus as
// corpus_writer, a role that can write that table and nothing else.
//
// Required env vars (auto-injected by both `supabase functions serve` and
// the deployed runtime):
//   SUPABASE_URL
//   SUPABASE_ANON_KEY
//
// Set in Supabase dashboard (deploy) and supabase/functions/.env (local):
//   CLOUDFLARE_ACCOUNT_ID
//   CLOUDFLARE_API_TOKEN
//   CORPUS_WRITER_DB_URL (the pooler URL, as corpus_writer)
//   AI_GATEWAY_ID (optional, defaults to sunlo-app)

import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'
import { normalize } from '../_shared/normalize.ts'

type SourceType = 'phrase' | 'translation' | 'request' | 'playlist'
type EntityType = 'phrase' | 'request' | 'playlist'

type Payload = {
	source_type: SourceType
	source_id: string
}

type CorpusRow = {
	source_type: SourceType
	source_id: string
	entity_type: EntityType
	entity_id: string
	entity_lang: string
	text_lang: string
	text: string
	text_normalized: string
	// Timestamp of the source row's most recent meaningful change (its
	// updated_at, falling back to created_at on legacy rows where
	// updated_at is null). We write this as vectorized_at on the corpus
	// row so out-of-order writes can be filtered (see the
	// skip_stale_corpus_upsert trigger).
	updated_at: string
}

const CF_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')
const CF_API_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN')
const AI_GATEWAY_ID = Deno.env.get('AI_GATEWAY_ID') ?? 'sunlo-app'
const HAS_WORKERS_AI = Boolean(CF_ACCOUNT_ID && CF_API_TOKEN)
const CORPUS_WRITER_DB_URL = Deno.env.get('CORPUS_WRITER_DB_URL')

if (!CORPUS_WRITER_DB_URL) {
	console.log(
		'[embed-corpus-row] CORPUS_WRITER_DB_URL not configured — every call will no-op, including archive/delete cleanup. Re-run scripts/backfill-search-corpus.ts to catch up the corpus once it is set.'
	)
} else if (!HAS_WORKERS_AI) {
	console.log(
		'[embed-corpus-row] Workers AI keys not configured — embed-and-upsert path will no-op. Archive/delete cleanup still runs. Re-run scripts/backfill-search-corpus.ts to catch up the corpus once keys are available.'
	)
}

const supabase = createClient(
	Deno.env.get('SUPABASE_URL')!,
	Deno.env.get('SUPABASE_ANON_KEY')!
)

// The transaction pooler cannot keep prepared statements between calls.
const sql = CORPUS_WRITER_DB_URL
	? postgres(CORPUS_WRITER_DB_URL, { prepare: false, max: 1 })
	: null

async function embedViaWorkersAI(text: string): Promise<number[]> {
	const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/baai/bge-m3`
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${CF_API_TOKEN}`,
			'cf-aig-gateway-id': AI_GATEWAY_ID,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ text: [text] }),
	})
	if (!res.ok) {
		throw new Error(
			`Workers AI embedding failed: ${res.status} ${await res.text()}`
		)
	}
	const json = await res.json()
	return json.result.data[0] as number[]
}

function vectorToPgLiteral(vec: number[]): string {
	return `[${vec.join(',')}]`
}

type Sql = NonNullable<typeof sql>

// Loads the source row and returns the corpus shape, or null if the
// source is no longer visible (archived / deleted / missing / empty
// text). Phrase rows fold in tag names — same as the backfill script.
async function loadSource(
	sourceType: SourceType,
	sourceId: string
): Promise<CorpusRow | null> {
	if (sourceType === 'phrase') {
		const { data } = await supabase
			.from('phrase_meta')
			.select('id, text, lang, archived, tags, updated_at, created_at')
			.eq('id', sourceId)
			.maybeSingle()
		if (!data || data.archived) return null
		if (!data.text || data.text.trim().length === 0) return null
		const tagNames = ((data.tags ?? []) as Array<{ name: string }>)
			.map((t) => t.name)
			.join(' ')
		const searchableText = tagNames ? `${data.text} ${tagNames}` : data.text
		return {
			source_type: 'phrase',
			source_id: data.id!,
			entity_type: 'phrase',
			entity_id: data.id!,
			entity_lang: data.lang!,
			text_lang: data.lang!,
			text: data.text,
			text_normalized: normalize(data.lang!, searchableText),
			updated_at: data.updated_at ?? data.created_at!,
		}
	}

	if (sourceType === 'translation') {
		const { data } = await supabase
			.from('phrase_translation')
			.select(
				'id, phrase_id, text, lang, archived, updated_at, created_at, phrase!inner(lang, archived)'
			)
			.eq('id', sourceId)
			.maybeSingle()
		if (!data || data.archived) return null
		const parent = data.phrase as unknown as { lang: string; archived: boolean }
		if (parent.archived) return null
		if (!data.text || data.text.trim().length === 0) return null
		return {
			source_type: 'translation',
			source_id: data.id,
			entity_type: 'phrase',
			entity_id: data.phrase_id,
			entity_lang: parent.lang,
			text_lang: data.lang,
			text: data.text,
			text_normalized: normalize(data.lang, data.text),
			updated_at: data.updated_at ?? data.created_at,
		}
	}

	if (sourceType === 'request') {
		const { data } = await supabase
			.from('phrase_request')
			.select('id, prompt, lang, deleted, updated_at, created_at')
			.eq('id', sourceId)
			.maybeSingle()
		if (!data || data.deleted) return null
		if (!data.prompt || data.prompt.trim().length === 0) return null
		return {
			source_type: 'request',
			source_id: data.id,
			entity_type: 'request',
			entity_id: data.id,
			entity_lang: data.lang,
			text_lang: data.lang,
			text: data.prompt,
			text_normalized: normalize(data.lang, data.prompt),
			updated_at: data.updated_at ?? data.created_at,
		}
	}

	// playlist
	const { data } = await supabase
		.from('phrase_playlist')
		.select('id, title, description, lang, deleted, updated_at, created_at')
		.eq('id', sourceId)
		.maybeSingle()
	if (!data || data.deleted) return null
	const text = [data.title, data.description ?? '']
		.filter(Boolean)
		.join('\n')
		.trim()
	if (text.length === 0) return null
	return {
		source_type: 'playlist',
		source_id: data.id,
		entity_type: 'playlist',
		entity_id: data.id,
		entity_lang: data.lang,
		text_lang: data.lang,
		text,
		text_normalized: normalize(data.lang, text),
		updated_at: data.updated_at ?? data.created_at,
	}
}

// When a phrase becomes invisible (archived), its TRANSLATIONS' corpus
// rows orphan. They keep the parent phrase's id as entity_id, so a single
// `delete where entity_id = <phrase_id>` cleans up the phrase row plus
// all its translation rows in one shot.
async function deleteCorpusRowsFor(
	sql: Sql,
	sourceType: SourceType,
	sourceId: string
): Promise<void> {
	if (sourceType === 'phrase') {
		await sql`delete from public.search_corpus where entity_id = ${sourceId}`
	} else {
		await sql`
			delete from public.search_corpus
			where source_type = ${sourceType} and source_id = ${sourceId}`
	}
}

async function upsertCorpusRow(
	sql: Sql,
	source: CorpusRow,
	embedding: number[]
): Promise<void> {
	await sql`
		insert into public.search_corpus (
			source_type, source_id, entity_id, entity_type, entity_lang,
			text_lang, text, text_normalized, embedding, vectorized_at
		) values (
			${source.source_type}, ${source.source_id}, ${source.entity_id},
			${source.entity_type}, ${source.entity_lang}, ${source.text_lang},
			${source.text}, ${source.text_normalized},
			${vectorToPgLiteral(embedding)}::public.vector, ${source.updated_at}
		)
		on conflict (source_type, source_id) do update set
			entity_id = excluded.entity_id,
			entity_type = excluded.entity_type,
			entity_lang = excluded.entity_lang,
			text_lang = excluded.text_lang,
			text = excluded.text,
			text_normalized = excluded.text_normalized,
			embedding = excluded.embedding,
			vectorized_at = excluded.vectorized_at`
}

// Decodes the verify_jwt-validated bearer token's payload. The runtime
// has already checked the signature; we just need the claims.
function jwtRole(req: Request): string | null {
	const auth = req.headers.get('Authorization')
	if (!auth?.startsWith('Bearer ')) return null
	const segments = auth.slice(7).split('.')
	if (segments.length !== 3) return null
	try {
		const payload = JSON.parse(atob(segments[1]))
		return typeof payload.role === 'string' ? payload.role : null
	} catch {
		return null
	}
}

Deno.serve(async (req) => {
	if (req.method !== 'POST') {
		return new Response('Method not allowed', { status: 405 })
	}

	if (jwtRole(req) !== 'authenticated') {
		return new Response(JSON.stringify({ error: 'forbidden' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	let payload: Payload
	try {
		payload = await req.json()
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	if (!sql) {
		return new Response(JSON.stringify({ skipped: 'no-corpus-writer' }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	try {
		const source = await loadSource(payload.source_type, payload.source_id)

		if (!source) {
			await deleteCorpusRowsFor(sql, payload.source_type, payload.source_id)
			return new Response(JSON.stringify({ deleted: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		}

		if (!HAS_WORKERS_AI) {
			// First-party-only mode. Trigger fired but we can't embed; new
			// rows stay reachable only via trigram until the backfill
			// catches them up. Existing corpus rows remain untouched.
			return new Response(JSON.stringify({ skipped: 'no-workers-ai' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		}

		const embedding = await embedViaWorkersAI(source.text_normalized)
		await upsertCorpusRow(sql, source, embedding)

		return new Response(JSON.stringify({ upserted: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		})
	} catch (err) {
		console.error('embed-corpus-row error:', err)
		return new Response(
			JSON.stringify({ error: (err as Error).message ?? 'Internal error' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		)
	}
})
