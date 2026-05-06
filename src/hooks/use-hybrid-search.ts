import { useMemo } from 'react'
import { useLiveQuery } from '@tanstack/react-db'
import { inArray } from '@tanstack/db'
import { useDebounce } from '@/hooks/use-debounce'
import { useSemanticSearch } from '@/hooks/use-semantic-search'
import { useTrigramSearch } from '@/hooks/use-trigram-search'

import { phrasesFull } from '@/features/phrases/live'
import { useLanguagesToShow } from '@/features/profile/hooks'
import { splitPhraseTranslations } from '@/hooks/composite-phrase'
import type { PhraseFullFilteredType } from '@/features/phrases/schemas'

export type HybridSearchResult = PhraseFullFilteredType & {
	similarityScore: number // trigram (0..1)
	semanticScore: number // cosine (0..1)
	combinedScore: number // sqrt(semanticScore) + sqrt(similarityScore)
}

const SEARCH_DEBOUNCE_MS = 300
const SEMANTIC_TOP_K = 20
const MIN_QUERY_LENGTH = 2

// Symmetric score-blend: sqrt(x) + sqrt(y). Sqrt amplifies low values on
// both sides — trigram similarity in the 0.15-0.30 range often surfaces
// genuinely-relevant matches (typos, inflections, partial substring), and
// the linear-trigram version was burying them. Semantic cosine values are
// already higher in absolute terms, so they don't need an extra weight to
// stay near the top.
//
// Exported so consumers (the /search route's playlist + request scoring,
// the /search/test diagnostic display) can apply the same formula
// directly.
export function combinedScore(semantic: number, trigram: number): number {
	return Math.sqrt(semantic) + Math.sqrt(trigram)
}

/**
 * Hybrid search for phrases: composes useSemanticSearch + useTrigramSearch
 * into a single ranking. Both primitives now hit search_corpus (semantic
 * via search_by_query, trigram via search_by_trigram), returning rows for
 * phrases, requests, and playlists. This hook focuses the result list on
 * phrases — but exposes per-entity score Maps (semanticById, trigramById)
 * over all entity types so /search can score playlists + requests against
 * the same yardstick.
 *
 * Trigram is paginated (source of "load more"); semantic is a one-shot
 * top-K. The first page of trigram + the semantic results get blended
 * via combinedScore; subsequent trigram pages append in their original
 * order without re-blending.
 *
 * Graceful degradation: if the semantic Edge Function fails or
 * search_corpus is empty for embeddings, the merged list is still
 * usable from trigram alone (and vice versa).
 */
export function useHybridSearch(langs: string[], query: string) {
	const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS)
	const { data: languagesToShow } = useLanguagesToShow()
	const enabled = debouncedQuery.length >= MIN_QUERY_LENGTH
	const langFilter = langs.length > 0 ? langs : null

	const trigram = useTrigramSearch(langFilter, debouncedQuery, { enabled })
	const semantic = useSemanticSearch(
		langFilter,
		{ kind: 'text', text: debouncedQuery },
		{ enabled, limit: SEMANTIC_TOP_K }
	)

	const matchingIds = useMemo(() => {
		// Score-blend (trigram page 1 phrases) ∪ (semantic phrases), sort
		// by combinedScore desc, then append remaining trigram-page phrases
		// in original order (deduped).
		const trigramFirstPhrases = (trigram.pages[0] ?? []).filter(
			(r) => r.entity_type === 'phrase'
		)
		const trigramRestPhrases = trigram.pages
			.slice(1)
			.flat()
			.filter((r) => r.entity_type === 'phrase')
		const semanticPhrases = semantic.data.filter(
			(r) => r.entity_type === 'phrase'
		)

		const blendIds = new Set<string>([
			...trigramFirstPhrases.map((r) => r.entity_id),
			...semanticPhrases.map((r) => r.entity_id),
		])
		const blended = [...blendIds]
			.map((id) => ({
				id,
				score: combinedScore(
					semantic.byId.get(id)?.score ?? 0,
					trigram.byId.get(id)?.similarity ?? 0
				),
			}))
			.toSorted((a, b) => b.score - a.score)
			.map(({ id }) => id)

		const tail = trigramRestPhrases
			.map((r) => r.entity_id)
			.filter((id) => !blendIds.has(id))
		return [...blended, ...tail]
	}, [trigram.pages, trigram.byId, semantic.data, semantic.byId])

	const phrasesQuery = useLiveQuery(
		(q) => {
			if (!matchingIds.length) return undefined
			return q
				.from({ phrase: phrasesFull })
				.where(({ phrase }) => inArray(phrase.id, matchingIds))
		},
		[matchingIds.join(',')]
	)

	const results = useMemo((): Array<HybridSearchResult> => {
		const phraseById = new Map(phrasesQuery.data?.map((p) => [p.id, p]) ?? [])
		const out: Array<HybridSearchResult> = []
		for (const id of matchingIds) {
			const phrase = phraseById.get(id)
			if (!phrase) continue
			const phraseFiltered = splitPhraseTranslations(
				phrase,
				languagesToShow ?? []
			)
			const semanticScore = semantic.byId.get(id)?.score ?? 0
			const similarityScore = trigram.byId.get(id)?.similarity ?? 0
			out.push({
				...phraseFiltered,
				similarityScore,
				semanticScore,
				combinedScore: combinedScore(semanticScore, similarityScore),
			})
		}
		return out
	}, [
		matchingIds,
		phrasesQuery.data,
		languagesToShow,
		semantic.byId,
		trigram.byId,
	])

	const semanticById = useMemo(
		() => new Map(semantic.data.map((r) => [r.entity_id, r.score])),
		[semantic.data]
	)
	const trigramById = useMemo(
		() => new Map(trigram.rows.map((r) => [r.entity_id, r.similarity])),
		[trigram.rows]
	)

	return {
		data: results,
		// Per-entity score Maps over ALL entity types — consumers can apply
		// combinedScore() to rank non-phrase rows on the same yardstick.
		semanticById,
		trigramById,
		isLoading: trigram.isLoading || trigram.isFetching || semantic.isLoading,
		isEmpty:
			trigram.isSuccess &&
			!semantic.isLoading &&
			matchingIds.length === 0 &&
			!!debouncedQuery,
		error: trigram.error,
		hasNextPage: trigram.hasNextPage,
		fetchNextPage: trigram.fetchNextPage,
		isFetchingNextPage: trigram.isFetchingNextPage,
	}
}
