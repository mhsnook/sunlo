// One-shot backfill for the chat_corpus table.
//
// Reads every active phrase and phrase_translation, normalizes the text,
// embeds via Cloudflare Workers AI (BGE-M3), and upserts into chat_corpus.
//
// Idempotent: source_type+source_id is unique, so re-runs update existing
// rows. Re-run when seed data changes or when normalization rules change.
//
// Usage:
//   pnpm tsx scripts/backfill-chat-corpus.ts
//
// Requires env vars (in .env or shell):
//   VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   CLOUDFLARE_ACCOUNT_ID
//   CLOUDFLARE_API_TOKEN

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { normalize } from '../src/features/chat/normalize'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !CF_ACCOUNT_ID || !CF_API_TOKEN) {
	console.error(
		'Missing one of: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN'
	)
	process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const BATCH_SIZE = 32 // Workers AI accepts batched embedding calls

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

async function main() {
	console.log('Loading phrases + translations…')
	const phrases = await loadPhrases()
	const translations = await loadTranslations()
	const rows = [...phrases, ...translations]
	console.log(
		`Loaded ${phrases.length} phrases + ${translations.length} translations = ${rows.length} corpus rows`
	)

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

	console.log('Done.')
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
