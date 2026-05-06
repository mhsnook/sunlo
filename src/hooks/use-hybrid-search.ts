import { useLiveQuery } from '@tanstack/react-db'
import { inArray } from '@tanstack/db'
import { useDebounce } from '@/hooks/use-debounce'
import { useSemanticSearch } from '@/hooks/use-semantic-search'
import {
	useTrigramSearch,
	type TrigramSortBy,
} from '@/hooks/use-trigram-search'

import { phrasesFull } from '@/features/phrases/live'
import { useLanguagesToShow } from '@/features/profile/hooks'
import { splitPhraseTranslations } from '@/hooks/composite-phrase'
import type { PhraseFullFilteredType } from '@/features/phrases/schemas'

export type SmartSearchSortBy = TrigramSortBy

export type HybridSearchResult = PhraseFullFilteredType & {
	similarityScore: number // trigram (0..1)
	popularityScore: number
	semanticScore: number // cosine (0..1), 0 if not surfaced by semantic
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
 * into a single ranking. Trigram is paginated (source of "load more");
 * semantic is a one-shot top-K. The first page of trigram + the semantic
 * results get blended via combinedScore; subsequent trigram pages append
 * in their original order without re-blending (no semantic data exists
 * for items past the first page).
 *
 * `langs` filters the result phrases to those languages. Pass an empty
 * array to search across all langs; both primitives accept null lang
 * filter and run cross-lingually.
 *
 * Graceful degradation: if the semantic Edge Function fails or
 * search_corpus is empty, the merged list is just trigram. The route never
 * breaks because of the semantic side. Only phrase entities returned by
 * semantic are blended into this hook's results; request and playlist
 * entities are exposed via `semanticById` so callers can show diagnostic
 * info on non-phrase result rows.
 */
export function useHybridSearch(
	langs: string[],
	query: string,
	sortBy: SmartSearchSortBy = 'relevance'
) {
	const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS)
	const { data: languagesToShow } = useLanguagesToShow()
	const enabled = debouncedQuery.length >= MIN_QUERY_LENGTH
	const langFilter = langs.length > 0 ? langs : null

	const trigram = useTrigramSearch(langFilter, debouncedQuery, {
		sortBy,
		enabled,
	})
	const semantic = useSemanticSearch(
		langFilter,
		{ kind: 'text', text: debouncedQuery },
		{ enabled, limit: SEMANTIC_TOP_K }
	)

	// Score-blend (trigram page 1) ∪ (semantic phrases), sort by
	// combinedScore desc, then append remaining trigram pages in their
	// original order (deduped).
	const trigramFirst = trigram.pages[0] ?? []
	const trigramRest = trigram.pages.slice(1).flat()
	const semanticPhrases = semantic.data.filter(
		(r) => r.entity_type === 'phrase'
	)

	const blendIds = new Set<string>([
		...trigramFirst.map((r) => r.id),
		...semanticPhrases.map((r) => r.entity_id),
	])
	const blendedIds = [...blendIds]
		.map((id) => ({
			id,
			score: combinedScore(
				semantic.byId.get(id)?.score ?? 0,
				trigram.byId.get(id)?.similarity_score ?? 0
			),
		}))
		.toSorted((a, b) => b.score - a.score)
		.map(({ id }) => id)

	const tail = trigramRest.map((r) => r.id).filter((id) => !blendIds.has(id))
	const matchingIds = [...blendedIds, ...tail]

	// Hydrate full phrase data from local collection.
	const phrasesQuery = useLiveQuery(
		(q) => {
			if (!matchingIds.length) return undefined
			return q
				.from({ phrase: phrasesFull })
				.where(({ phrase }) => inArray(phrase.id, matchingIds))
		},
		[matchingIds.join(',')]
	)

	const results: Array<HybridSearchResult> = []
	for (const id of matchingIds) {
		const phrase = phrasesQuery.data?.find((p) => p.id === id)
		if (!phrase) continue
		const phraseFiltered = splitPhraseTranslations(
			phrase,
			languagesToShow ?? []
		)
		const trigramRow = trigram.byId.get(id)
		const semanticScore = semantic.byId.get(id)?.score ?? 0
		const similarityScore = trigramRow?.similarity_score ?? 0
		results.push({
			...phraseFiltered,
			similarityScore,
			popularityScore: trigramRow?.popularity_score ?? 0,
			semanticScore,
			combinedScore: combinedScore(semanticScore, similarityScore),
		})
	}

	return {
		data: results,
		// Map<entity_id, score> over all entity types — for diagnostic
		// display on non-phrase result rows.
		semanticById: new Map(semantic.data.map((r) => [r.entity_id, r.score])),
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
