// Backfill for the chat_corpus table.
//
// Reads every active phrase and phrase_translation, normalizes the text,
// embeds via Cloudflare Workers AI (BGE-M3), and upserts into chat_corpus.
//
// Idempotent: source_type+source_id is unique, so re-runs update existing
// rows.
//
// Usage:
//   pnpm tsx scripts/backfill-chat-corpus.ts
//     Full backfill: text + text_normalized + embedding. Hits Workers AI.
//
//   pnpm tsx scripts/backfill-chat-corpus.ts --normalize-only
//     Only updates text + text_normalized on existing rows. Skips Workers
//     AI entirely. Use after tweaking normalize.ts when you don't want to
//     burn embedding calls re-vectorizing things that barely changed.
//     Rows that don't already exist are skipped (run a full backfill first).
//
// Required env vars (in .env or shell):
//   VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   CLOUDFLARE_ACCOUNT_ID         (only needed for full backfill)
//   CLOUDFLARE_API_TOKEN          (only needed for full backfill)

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { normalize } from '../src/features/chat/normalize'

const NORMALIZE_ONLY = process.argv.includes('--normalize-only')

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
		'Full backfill requires CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN. ' +
			'Use --normalize-only to skip embeddings.'
	)
	process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const BATCH_SIZE = 32

type CorpusRow = {
	source_type: 'phrase' | 'translation'
	source_id: string
	phrase_id: string
	lang: string
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
	const data: number[][] | undefined =
		json?.result?.data ?? json?.result?.response?.data ?? json?.response?.data

	if (!Array.isArray(data) || data.length !== texts.length) {
		throw new Error(
			`Unexpected Workers AI response shape: ${JSON.stringify(json).slice(0, 200)}`
		)
	}
	return data
}

function pgVecLiteral(v: number[]): string {
	return `[${v.join(',')}]`
}

async function loadPhrases(): Promise<CorpusRow[]> {
	const { data, error } = await supabase
		.from('phrase')
		.select('id, text, lang')
		.eq('archived', false)
	if (error) throw error
	return (data ?? [])
		.filter((p) => p.text && p.text.trim().length > 0)
		.map((p) => ({
			source_type: 'phrase',
			source_id: p.id,
			phrase_id: p.id,
			lang: p.lang,
			text: p.text,
			text_normalized: normalize(p.lang, p.text),
		}))
}

async function loadTranslations(): Promise<CorpusRow[]> {
	const { data, error } = await supabase
		.from('phrase_translation')
		.select('id, phrase_id, text, lang')
		.eq('archived', false)
	if (error) throw error
	return (data ?? [])
		.filter((t) => t.text && t.text.trim().length > 0)
		.map((t) => ({
			source_type: 'translation',
			source_id: t.id,
			phrase_id: t.phrase_id,
			lang: t.lang,
			text: t.text,
			text_normalized: normalize(t.lang, t.text),
		}))
}

async function fullBackfill(rows: CorpusRow[]) {
	let processed = 0
	for (let i = 0; i < rows.length; i += BATCH_SIZE) {
		const batch = rows.slice(i, i + BATCH_SIZE)
		const embeddings = await embedBatch(batch.map((r) => r.text_normalized))

		const upsertRows = batch.map((r, idx) => ({
			source_type: r.source_type,
			source_id: r.source_id,
			phrase_id: r.phrase_id,
			lang: r.lang,
			text: r.text,
			text_normalized: r.text_normalized,
			embedding: pgVecLiteral(embeddings[idx]!),
		}))

		const { error } = await supabase
			.from('chat_corpus')
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

		// Per-row update; embeddings are left untouched. Done in parallel
		// within a batch so this isn't slow on a few hundred rows.
		const results = await Promise.all(
			batch.map(async (r) => {
				const { data, error } = await supabase
					.from('chat_corpus')
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
			`\n${missing} rows weren't in chat_corpus yet. Run a full backfill (without --normalize-only) to embed them.`
		)
	}
}

async function main() {
	console.log(
		NORMALIZE_ONLY
			? 'Mode: --normalize-only (skipping Workers AI)'
			: 'Mode: full backfill (text + text_normalized + embedding)'
	)
	console.log('Loading phrases + translations…')
	const phrases = await loadPhrases()
	const translations = await loadTranslations()
	const rows = [...phrases, ...translations]
	console.log(
		`Loaded ${phrases.length} phrases + ${translations.length} translations = ${rows.length} corpus rows`
	)

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
