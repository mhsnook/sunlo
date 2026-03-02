/**
 * Edge Function: search-hybrid
 *
 * Orchestrates hybrid search:
 * 1. Receives text query from client
 * 2. Generates query embedding via embedding API
 * 3. Calls search_phrases_hybrid RPC with text + vector
 * 4. Returns fused results
 *
 * POST {
 *   query: string,
 *   lang: string,
 *   sort_by?: 'relevance' | 'popularity',
 *   semantic_weight?: number (0-1, default 0.5),
 *   limit?: number (default 20),
 *   cursor_created_at?: string,
 *   cursor_id?: string
 * }
 */
import { corsHeaders } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-client.ts'
import { generateEmbeddings } from '../_shared/embedding-client.ts'

Deno.serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders })
	}

	if (req.method !== 'POST') {
		return new Response('Method not allowed', { status: 405 })
	}

	try {
		const {
			query,
			lang,
			semantic_weight = 0.5,
			limit = 20,
			cursor_created_at = null,
			cursor_id = null,
		} = await req.json()

		if (!query || query.length < 2) {
			return new Response(JSON.stringify({ data: [] }), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			})
		}

		const supabase = createAdminClient()

		// Get active embedding config for model/dimensions
		const { data: config } = await supabase
			.from('embedding_config')
			.select('model_name, dimensions')
			.eq('is_active', true)
			.single()

		// Generate query embedding
		let queryEmbedding: Array<number> | null = null
		try {
			const embeddings = await generateEmbeddings([query], {
				model: config?.model_name,
				dimensions: config?.dimensions,
			})
			queryEmbedding = embeddings[0]
		} catch (embeddingError) {
			// If embedding fails, fall back to trigram-only search
			console.error(
				'Embedding generation failed, falling back to trigram:',
				embeddingError
			)
		}

		// Call hybrid search RPC
		const { data, error } = await supabase.rpc('search_phrases_hybrid', {
			query_text: query,
			query_embedding: queryEmbedding ? JSON.stringify(queryEmbedding) : null,
			lang_filter: lang || null,
			semantic_weight: queryEmbedding ? semantic_weight : 0,
			result_limit: limit,
			cursor_created_at,
			cursor_id,
		})

		if (error) throw error

		return new Response(JSON.stringify({ data: data ?? [] }), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		})
	} catch (error) {
		const message =
			error instanceof Error ? error.message
			: typeof error === 'object' && error !== null && 'message' in error ?
				(error as { message: string }).message
			:	JSON.stringify(error)
		return new Response(
			JSON.stringify({
				error: message,
			}),
			{
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}
		)
	}
})
