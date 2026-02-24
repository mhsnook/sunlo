import { get, set } from 'idb-keyval'
import type { PhraseFullType } from './schemas'

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2'
const CACHE_VERSION = 1
const EMBEDDING_DIM = 384

type EmbeddingCache = Record<string, { hash: string; vector: Array<number> }>

/** Simple hash of phrase text + translations for cache invalidation */
function phraseHash(phrase: PhraseFullType): string {
	const parts = [phrase.text, ...phrase.translations.map((t) => t.text).sort()]
	return parts.join('|')
}

/** Build the text we embed: phrase text + English translations */
function phraseToEmbedText(phrase: PhraseFullType): string {
	const translations = phrase.translations
		.filter((t) => t.lang === 'eng' && !t.archived)
		.map((t) => t.text)
	if (translations.length > 0) {
		return `${phrase.text} (${translations.join('; ')})`
	}
	// Fall back to all non-archived translations if no English ones
	const allTranslations = phrase.translations
		.filter((t) => !t.archived)
		.map((t) => t.text)
	if (allTranslations.length > 0) {
		return `${phrase.text} (${allTranslations.join('; ')})`
	}
	return phrase.text
}

function cacheKey(lang: string): string {
	return `phrase-embeddings-v${CACHE_VERSION}-${lang}`
}

async function loadCache(lang: string): Promise<EmbeddingCache> {
	try {
		return (await get(cacheKey(lang))) ?? {}
	} catch {
		return {}
	}
}

async function saveCache(lang: string, cache: EmbeddingCache): Promise<void> {
	try {
		await set(cacheKey(lang), cache)
	} catch (e) {
		console.warn('Failed to save embedding cache:', e)
	}
}

export type EmbeddingProgress = {
	stage: 'loading-model' | 'embedding' | 'done'
	/** 0-1 progress within the current stage */
	progress: number
	/** How many phrases have been embedded so far */
	embedded: number
	total: number
}

export type PhraseEmbedding = {
	phraseId: string
	vector: Array<number>
}

/**
 * Generate embeddings for a set of phrases using Transformers.js.
 * Uses IndexedDB to cache results and skip already-embedded phrases.
 */
export async function generateEmbeddings(
	phrases: Array<PhraseFullType>,
	lang: string,
	onProgress?: (progress: EmbeddingProgress) => void
): Promise<Array<PhraseEmbedding>> {
	onProgress?.({
		stage: 'loading-model',
		progress: 0,
		embedded: 0,
		total: phrases.length,
	})

	// Dynamic import to avoid loading the 30MB model on unrelated pages
	const { pipeline } = await import('@huggingface/transformers')

	const extractor = await pipeline('feature-extraction', MODEL_NAME, {
		dtype: 'fp32',
	})

	onProgress?.({
		stage: 'loading-model',
		progress: 1,
		embedded: 0,
		total: phrases.length,
	})

	// Load cache and figure out which phrases need embedding
	const cache = await loadCache(lang)
	const results: Array<PhraseEmbedding> = []
	const toEmbed: Array<{ phrase: PhraseFullType; text: string }> = []

	for (const phrase of phrases) {
		const hash = phraseHash(phrase)
		const cached = cache[phrase.id]
		if (cached && cached.hash === hash) {
			results.push({ phraseId: phrase.id, vector: cached.vector })
		} else {
			toEmbed.push({ phrase, text: phraseToEmbedText(phrase) })
		}
	}

	// Embed uncached phrases in batches
	const BATCH_SIZE = 32
	let embedded = results.length

	for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
		const batch = toEmbed.slice(i, i + BATCH_SIZE)
		const texts = batch.map((b) => b.text)

		const output = await extractor(texts, {
			pooling: 'mean',
			normalize: true,
		})

		// output is a Tensor with shape [batch_size, EMBEDDING_DIM]
		const outputData = (output as unknown as { data: Float32Array }).data

		for (let j = 0; j < batch.length; j++) {
			const start = j * EMBEDDING_DIM
			const vector: Array<number> = Array.from(
				outputData.slice(start, start + EMBEDDING_DIM)
			)
			const phrase = batch[j].phrase
			const hash = phraseHash(phrase)

			cache[phrase.id] = { hash, vector }
			results.push({ phraseId: phrase.id, vector })
			embedded++
		}

		onProgress?.({
			stage: 'embedding',
			progress: embedded / phrases.length,
			embedded,
			total: phrases.length,
		})
	}

	// Save updated cache
	await saveCache(lang, cache)

	onProgress?.({
		stage: 'done',
		progress: 1,
		embedded: phrases.length,
		total: phrases.length,
	})

	return results
}

/** Cosine similarity between two normalized vectors (just dot product) */
export function cosineSimilarity(a: Array<number>, b: Array<number>): number {
	let dot = 0
	for (let i = 0; i < EMBEDDING_DIM; i++) {
		dot += a[i] * b[i]
	}
	return dot
}
