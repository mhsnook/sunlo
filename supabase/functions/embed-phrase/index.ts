/**
 * Edge Function: embed-phrase
 *
 * Generates vector embeddings for phrases. Two modes:
 * 1. Specific IDs: POST { phrase_ids: ["uuid1", "uuid2"] }
 * 2. Backfill: POST { backfill: true, backfill_limit: 200 }
 *
 * Fetches phrase text + translations + tags, composes embedding text,
 * calls the embedding API, and stores results in phrase_embedding.
 */
import { corsHeaders } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-client.ts'
import {
	generateEmbeddings,
	composeEmbeddingText,
} from '../_shared/embedding-client.ts'

const BATCH_SIZE = 50

interface EmbeddingInput {
	phraseId: string
	text: string
}

interface BatchResult {
	embedded: number
	errors: Array<{ phraseId: string; error: string }>
}

async function processBatch(
	embeddingInputs: Array<EmbeddingInput>,
	configId: string,
	supabase: ReturnType<typeof createAdminClient>
): Promise<BatchResult> {
	const embeddings = await generateEmbeddings(
		embeddingInputs.map((e) => e.text)
	)

	const rows = embeddingInputs.map((input, idx) => ({
		phrase_id: input.phraseId,
		config_id: configId,
		embedding: JSON.stringify(embeddings[idx]),
		embedding_text: input.text,
	}))

	const { error: upsertError } = await supabase
		.from('phrase_embedding')
		.upsert(rows, { onConflict: 'phrase_id,config_id' })

	if (upsertError) throw upsertError

	return { embedded: embeddingInputs.length, errors: [] }
}

Deno.serve(async (req) => {
	// Handle CORS preflight
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders })
	}

	if (req.method !== 'POST') {
		return new Response('Method not allowed', { status: 405 })
	}

	try {
		const body = await req.json()
		const supabase = createAdminClient()

		// Get active embedding config
		const { data: config, error: configError } = await supabase
			.from('embedding_config')
			.select('*')
			.eq('is_active', true)
			.single()

		if (configError || !config) {
			return new Response(
				JSON.stringify({ error: 'No active embedding config found' }),
				{
					status: 500,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				}
			)
		}

		// Determine which phrases to embed
		let phraseIds: Array<string>

		if (body.backfill) {
			// Find phrases without embeddings for the active config
			const limit = body.backfill_limit ?? 200
			const { data: phrases, error } = await supabase
				.from('phrase')
				.select('id')
				.not(
					'id',
					'in',
					`(select phrase_id from phrase_embedding where config_id = '${config.id}')`
				)
				.limit(limit)

			if (error) throw error
			phraseIds = (phrases ?? []).map((p: { id: string }) => p.id)
		} else if (body.phrase_ids) {
			phraseIds = body.phrase_ids
		} else {
			return new Response(
				JSON.stringify({ error: 'Provide phrase_ids or backfill: true' }),
				{
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				}
			)
		}

		if (phraseIds.length === 0) {
			return new Response(
				JSON.stringify({ embedded: 0, message: 'No phrases to embed' }),
				{ headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
			)
		}

		// Fetch full phrase data (text + translations + tags)
		const { data: phrases, error: phrasesError } = await supabase
			.from('phrase')
			.select(
				`
				id,
				text,
				lang,
				phrase_translation!inner (text, lang, archived),
				phrase_tag (tag (name))
			`
			)
			.in('id', phraseIds)

		if (phrasesError) throw phrasesError

		// Compose embedding inputs for all phrases
		const allInputs = (phrases ?? []).map((phrase) => {
			const translations = (phrase.phrase_translation ?? [])
				.filter((t: { archived: boolean }) => !t.archived)
				.map((t: { text: string; lang: string }) => ({
					text: t.text,
					lang: t.lang,
				}))

			const tags = (phrase.phrase_tag ?? [])
				.map((pt: { tag: { name: string } | null }) => pt.tag)
				.filter(Boolean) as Array<{ name: string }>

			return {
				phraseId: phrase.id,
				text: composeEmbeddingText({
					text: phrase.text,
					lang: phrase.lang,
					translations,
					tags,
				}),
			}
		})

		// Split into batches and process sequentially
		const batches: Array<Array<EmbeddingInput>> = []
		for (let i = 0; i < allInputs.length; i += BATCH_SIZE) {
			batches.push(allInputs.slice(i, i + BATCH_SIZE))
		}

		const batchResults = await batches.reduce(
			async (accPromise, batch) => {
				const acc = await accPromise
				try {
					const result = await processBatch(batch, config.id, supabase)
					return {
						totalEmbedded: acc.totalEmbedded + result.embedded,
						errors: [...acc.errors, ...result.errors],
					}
				} catch (batchError) {
					const batchErrors = batch.map((input) => ({
						phraseId: input.phraseId,
						error:
							batchError instanceof Error ?
								batchError.message
							:	String(batchError),
					}))
					return {
						totalEmbedded: acc.totalEmbedded,
						errors: [...acc.errors, ...batchErrors],
					}
				}
			},
			Promise.resolve({
				totalEmbedded: 0,
				errors: [] as Array<{ phraseId: string; error: string }>,
			})
		)

		return new Response(
			JSON.stringify({
				embedded: batchResults.totalEmbedded,
				errors:
					batchResults.errors.length > 0 ? batchResults.errors : undefined,
				config: { model: config.model_name, provider: config.model_provider },
			}),
			{ headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
		)
	} catch (error) {
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : String(error),
			}),
			{
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}
		)
	}
})
