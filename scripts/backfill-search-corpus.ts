// Backfill for the search_corpus table.
//
// Reads every active phrase, phrase_translation, and phrase_request,
// normalizes the text, embeds via Cloudflare Workers AI (BGE-M3), and
// upserts into search_corpus.
//
// Idempotent: source_type+source_id is unique, so re-runs update existing
// rows in place.
//
// Usage:
//   pnpm tsx scripts/backfill-search-corpus.ts
//     Full backfill: text + text_normalized + embedding for every row.
//     Hits Workers AI for every row regardless of whether it already
//     existed. Use after seed changes or when normalization rules change.
//
//   pnpm tsx scripts/backfill-search-corpus.ts --skip-existing
//     Skip rows that are already present in search_corpus (matched by
//     source_type + source_id). Use when you've added new content
//     (e.g., a new request, new phrases) and want to embed only the
//     new rows. Cheapest run-mode that still calls Workers AI.
//
//   pnpm tsx scripts/backfill-search-corpus.ts --normalize-only
//     Only updates text + text_normalized on existing rows. Skips
//     Workers AI entirely. Use after tweaking
//     src/features/chat/normalize.ts when you don't want to burn
//     embedding credits re-vectorizing things that barely changed.
//     Rows that don't yet exist are skipped (run a full or
//     --skip-existing backfill first to seed them).
//
// Required env vars (in .env or shell):
//   VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   CLOUDFLARE_ACCOUNT_ID         (only needed when embedding)
//   CLOUDFLARE_API_TOKEN          (only needed when embedding)

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { normalize } from '../src/features/chat/normalize'

const NORMALIZE_ONLY = process.argv.includes('--normalize-only')
const SKIP_EXISTING = process.argv.includes('--skip-existing')

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
	console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
	process.exit(1)
}
if (!NORMALIZE_ONLY && (!CF_ACCOUNT_ID || !CF_API_TOKEN)) {
	console.error(
		'Embedding requires CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN. ' +
			'Use --normalize-only to skip embeddings.'
	)
	process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const BATCH_SIZE = 32

type SourceType = 'phrase' | 'translation' | 'request' | 'playlist'
type EntityType = 'phrase' | 'request' | 'playlist'

type CorpusRow = {
	source_type: SourceType
	source_id: string
	entity_type: EntityType
	entity_id: string
	entity_lang: string
	text_lang: string
	text: string
	text_normalized: string
}

async function embedBatch(texts: string[]): Promise<number[][]> {
	const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/baai/bge-m3`
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${CF_API_TOKEN}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ text: texts }),
	})

	if (!res.ok) {
		const body = await res.text()
		throw new Error(`Workers AI embedding failed: ${res.status} ${body}`)
	}

	const json = await res.json()
	return json.result.data as number[][]
}

function pgVecLiteral(v: number[]): string {
	return `[${v.join(',')}]`
}

async function loadPhrases(): Promise<CorpusRow[]> {
	const { data, error } = await supabase
		.from('phrase_meta')
		.select('id, text, lang, tags')
		.eq('archived', false)
	if (error) throw error
	return (data ?? [])
		.filter((p) => p.text && p.text.trim().length > 0)
		.map((p) => {
			const tagNames = ((p.tags ?? []) as Array<{ name: string }>)
				.map((t) => t.name)
				.join(' ')
			// `text` stays clean for display in matched_text result rows;
			// `text_normalized` includes tag names so both trigram and
			// semantic indexing pick up tag context.
			const searchableText = tagNames ? `${p.text} ${tagNames}` : p.text
			return {
				source_type: 'phrase',
				source_id: p.id!,
				entity_type: 'phrase',
				entity_id: p.id!,
				entity_lang: p.lang!,
				text_lang: p.lang!,
				text: p.text!,
				text_normalized: normalize(p.lang!, searchableText),
			}
		})
}

async function loadTranslations(): Promise<CorpusRow[]> {
	const { data, error } = await supabase
		.from('phrase_translation')
		.select('id, phrase_id, text, lang, phrase!inner(lang)')
		.eq('archived', false)
		.eq('phrase.archived', false)
	if (error) throw error
	return (data ?? [])
		.filter((t) => t.text.trim().length > 0)
		.map((t) => ({
			source_type: 'translation',
			source_id: t.id,
			entity_type: 'phrase',
			entity_id: t.phrase_id,
			entity_lang: (t.phrase as unknown as { lang: string }).lang,
			text_lang: t.lang,
			text: t.text,
			text_normalized: normalize(t.lang, t.text),
		}))
}

async function loadRequests(): Promise<CorpusRow[]> {
	const { data, error } = await supabase
		.from('phrase_request')
		.select('id, prompt, lang')
		.eq('deleted', false)
	if (error) throw error
	return (data ?? [])
		.filter((r) => r.prompt.trim().length > 0)
		.map((r) => ({
			source_type: 'request',
			source_id: r.id,
			entity_type: 'request',
			entity_id: r.id,
			entity_lang: r.lang,
			text_lang: r.lang,
			text: r.prompt,
			text_normalized: normalize(r.lang, r.prompt),
		}))
}

async function loadPlaylists(): Promise<CorpusRow[]> {
	const { data, error } = await supabase
		.from('phrase_playlist')
		.select('id, title, description, lang')
		.eq('deleted', false)
	if (error) throw error
	return (data ?? [])
		.map((p) => {
			const text = [p.title, p.description ?? '']
				.filter(Boolean)
				.join('\n')
				.trim()
			return { p, text }
		})
		.filter(({ text }) => text.length > 0)
		.map(({ p, text }) => ({
			source_type: 'playlist',
			source_id: p.id,
			entity_type: 'playlist',
			entity_id: p.id,
			entity_lang: p.lang,
			text_lang: p.lang,
			text,
			text_normalized: normalize(p.lang, text),
		}))
}

async function loadExistingKeys(): Promise<Set<string>> {
	const keys = new Set<string>()
	let from = 0
	const PAGE = 1000
	for (;;) {
		const { data, error } = await supabase
			.from('search_corpus')
			.select('source_type, source_id')
			.range(from, from + PAGE - 1)
		if (error) throw error
		if (!data || data.length === 0) break
		for (const row of data) keys.add(`${row.source_type}|${row.source_id}`)
		if (data.length < PAGE) break
		from += PAGE
	}
	return keys
}

async function fullBackfill(rows: CorpusRow[]) {
	let processed = 0
	for (let i = 0; i < rows.length; i += BATCH_SIZE) {
		const batch = rows.slice(i, i + BATCH_SIZE)
		const embeddings = await embedBatch(batch.map((r) => r.text_normalized))

		const upsertRows = batch.map((r, idx) => ({
			source_type: r.source_type,
			source_id: r.source_id,
			entity_type: r.entity_type,
			entity_id: r.entity_id,
			entity_lang: r.entity_lang,
			text_lang: r.text_lang,
			text: r.text,
			text_normalized: r.text_normalized,
			embedding: pgVecLiteral(embeddings[idx]!),
		}))

		const { error } = await supabase
			.from('search_corpus')
			.upsert(upsertRows, { onConflict: 'source_type,source_id' })

		if (error) {
			console.error(`Batch ${i / BATCH_SIZE} upsert failed:`, error)
			throw error
		}

		processed += batch.length
		console.log(`  ${processed}/${rows.length}`)
	}
}

async function normalizeOnlyBackfill(rows: CorpusRow[]) {
	let processed = 0
	let updated = 0
	let missing = 0
	for (let i = 0; i < rows.length; i += BATCH_SIZE) {
		const batch = rows.slice(i, i + BATCH_SIZE)

		// Per-row update; embeddings + entity_lang/text_lang/entity_type are
		// left untouched. Done in parallel within a batch so this isn't slow
		// on a few hundred rows.
		const results = await Promise.all(
			batch.map(async (r) => {
				const { data, error } = await supabase
					.from('search_corpus')
					.update({ text: r.text, text_normalized: r.text_normalized })
					.eq('source_type', r.source_type)
					.eq('source_id', r.source_id)
					.select('source_id')

				if (error) {
					console.error(
						`Update failed for ${r.source_type}:${r.source_id}:`,
						error
					)
					throw error
				}
				return data?.length ?? 0
			})
		)

		updated += results.reduce((acc, n) => acc + (n > 0 ? 1 : 0), 0)
		missing += results.reduce((acc, n) => acc + (n === 0 ? 1 : 0), 0)
		processed += batch.length
		console.log(
			`  ${processed}/${rows.length} (${updated} updated, ${missing} missing)`
		)
	}

	if (missing > 0) {
		console.log(
			`\n${missing} rows weren't in search_corpus yet. Run a full backfill (or --skip-existing) to embed them.`
		)
	}
}

async function main() {
	const mode = NORMALIZE_ONLY
		? '--normalize-only (skipping Workers AI)'
		: SKIP_EXISTING
			? '--skip-existing (embed only new rows)'
			: 'full backfill (text + text_normalized + embedding for every row)'
	console.log(`Mode: ${mode}`)

	console.log('Loading phrases + translations + requests + playlists…')
	const [phrases, translations, requests, playlists] = await Promise.all([
		loadPhrases(),
		loadTranslations(),
		loadRequests(),
		loadPlaylists(),
	])
	let rows = [...phrases, ...translations, ...requests, ...playlists]
	console.log(
		`Loaded ${phrases.length} phrases + ${translations.length} translations + ${requests.length} requests + ${playlists.length} playlists = ${rows.length} corpus rows`
	)

	if (SKIP_EXISTING) {
		const existing = await loadExistingKeys()
		const before = rows.length
		rows = rows.filter((r) => !existing.has(`${r.source_type}|${r.source_id}`))
		console.log(
			`Filtered out ${before - rows.length} existing rows; ${rows.length} new rows to embed`
		)
		if (rows.length === 0) {
			console.log('Nothing to do.')
			return
		}
	}

	if (NORMALIZE_ONLY) {
		await normalizeOnlyBackfill(rows)
	} else {
		await fullBackfill(rows)
	}

	console.log('Done.')
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
