/**
 * Edge Function: process-embedding-queue
 *
 * Reads phrases from the embedding queue, generates embeddings,
 * and removes processed items from the queue.
 *
 * Designed to be called periodically (e.g., via pg_cron or external cron).
 * POST { batch_size?: number } — defaults to 50.
 */
import { corsHeaders } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-client.ts'
import {
	generateEmbeddings,
	composeEmbeddingText,
} from '../_shared/embedding-client.ts'

const DEFAULT_BATCH_SIZE = 50

Deno.serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders })
	}

	if (req.method !== 'POST') {
		return new Response('Method not allowed', { status: 405 })
	}

	try {
		const body = await req.json().catch(() => ({}))
		const batchSize = body.batch_size ?? DEFAULT_BATCH_SIZE
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

		// Read from queue (oldest first)
		const { data: queueItems, error: queueError } = await supabase
			.from('phrase_embedding_queue')
			.select('phrase_id, reason')
			.order('queued_at', { ascending: true })
			.limit(batchSize)

		if (queueError) throw queueError

		if (!queueItems || queueItems.length === 0) {
			return new Response(
				JSON.stringify({ processed: 0, message: 'Queue is empty' }),
				{ headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
			)
		}

		const phraseIds = queueItems.map((q) => q.phrase_id)

		// Fetch full phrase data
		const { data: phrases, error: phrasesError } = await supabase
			.from('phrase')
			.select(
				`
				id,
				text,
				lang,
				phrase_translation (text, lang, archived),
				phrase_tag (tag (name))
			`
			)
			.in('id', phraseIds)

		if (phrasesError) throw phrasesError

		if (!phrases || phrases.length === 0) {
			// Phrases were deleted — clear queue entries
			await supabase
				.from('phrase_embedding_queue')
				.delete()
				.in('phrase_id', phraseIds)

			return new Response(
				JSON.stringify({
					processed: 0,
					message: 'Phrases no longer exist, cleared queue',
				}),
				{ headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
			)
		}

		// Compose embedding texts
		const embeddingInputs = phrases.map((phrase) => {
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

		// Generate embeddings
		const embeddings = await generateEmbeddings(
			embeddingInputs.map((e) => e.text)
		)

		// Store embeddings
		const rows = embeddingInputs.map((input, idx) => ({
			phrase_id: input.phraseId,
			config_id: config.id,
			embedding: JSON.stringify(embeddings[idx]),
			embedding_text: input.text,
		}))

		const { error: upsertError } = await supabase
			.from('phrase_embedding')
			.upsert(rows, { onConflict: 'phrase_id,config_id' })

		if (upsertError) throw upsertError

		// Remove processed items from queue
		const processedIds = embeddingInputs.map((e) => e.phraseId)
		const { error: deleteError } = await supabase
			.from('phrase_embedding_queue')
			.delete()
			.in('phrase_id', processedIds)

		if (deleteError) throw deleteError

		return new Response(
			JSON.stringify({
				processed: processedIds.length,
				remaining: queueItems.length - processedIds.length,
				config: { model: config.model_name },
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
