/**
 * OpenAI-compatible embedding client.
 * Works with OpenRouter, Mistral, OpenAI, or any OpenAI-compatible endpoint.
 * Provider is configured via environment variables.
 */

interface EmbeddingResponse {
	data: Array<{ embedding: Array<number>; index: number }>
	model: string
	usage: { prompt_tokens: number; total_tokens: number }
}

export async function generateEmbeddings(
	texts: Array<string>,
	model?: string
): Promise<Array<Array<number>>> {
	const apiUrl =
		Deno.env.get('EMBEDDING_API_URL') ??
		'https://openrouter.ai/api/v1/embeddings'
	const apiKey = Deno.env.get('EMBEDDING_API_KEY')
	const modelName =
		model ?? Deno.env.get('EMBEDDING_MODEL') ?? 'qwen/qwen3-embedding-8b'

	if (!apiKey) {
		throw new Error('EMBEDDING_API_KEY is not set')
	}

	const response = await fetch(apiUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model: modelName,
			input: texts,
			dimensions: 1024,
		}),
	})

	if (!response.ok) {
		const errorBody = await response.text()
		throw new Error(`Embedding API error ${response.status}: ${errorBody}`)
	}

	const result: EmbeddingResponse = await response.json()

	// Sort by index to maintain input order
	const sorted = result.data.toSorted((a, b) => a.index - b.index)
	return sorted.map((d) => d.embedding)
}

/**
 * Compose the text to embed for a phrase.
 * Includes the phrase text, its translations, and tags for cross-lingual matching.
 *
 * Format: "phrase_text [lang] | translation1 [trans_lang] | ... | #tag1 #tag2"
 */
export function composeEmbeddingText(phrase: {
	text: string
	lang: string
	translations: Array<{ text: string; lang: string }>
	tags: Array<{ name: string }>
}): string {
	const parts: Array<string> = [`${phrase.text} [${phrase.lang}]`]

	for (const t of phrase.translations) {
		parts.push(`${t.text} [${t.lang}]`)
	}

	if (phrase.tags.length > 0) {
		parts.push(phrase.tags.map((t) => `#${t.name}`).join(' '))
	}

	return parts.join(' | ')
}
