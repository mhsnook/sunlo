import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useLiveQuery } from '@tanstack/react-db'
import { inArray } from '@tanstack/db'
import { useDebounce } from '@/hooks/use-debounce'

import supabase from '@/lib/supabase-client'
import { phrasesFull } from '@/features/phrases/live'
import { useLanguagesToShow } from '@/features/profile/hooks'
import { splitPhraseTranslations } from '@/hooks/composite-phrase'
import type { PhraseFullFilteredType } from '@/features/phrases/schemas'

export type SmartSearchSortBy = 'relevance' | 'popularity'

interface TrigramRow {
	id: string
	similarity_score: number
	popularity_score: number
	created_at: string
}

interface SemanticRow {
	entity_type: 'phrase' | 'request' | 'playlist'
	entity_id: string
	score: number
}

export type HybridSearchResult = PhraseFullFilteredType & {
	similarityScore: number // trigram (0..1)
	popularityScore: number
	semanticScore: number // cosine (0..1), 0 if not surfaced by semantic
	combinedScore: number // 3·sqrt(semanticScore/4) + similarityScore
}

const SEARCH_PAGE_SIZE = 20
const SEMANTIC_TOP_K = 20
const SEARCH_DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2

// Symmetric score-blend: sqrt(x) + sqrt(y). Sqrt amplifies low values on
// both sides — trigram similarity in the 0.15-0.30 range often surfaces
// genuinely-relevant matches (typos, inflections, partial substring), and
// the linear-trigram version was burying them. Semantic cosine values are
// already higher in absolute terms, so they don't need an extra weight to
// stay near the top.
function combinedScore(semantic: number, trigram: number): number {
	return Math.sqrt(semantic) + Math.sqrt(trigram)
}

/**
 * Hybrid search for phrases: blends trigram (lexical) and semantic (BGE-M3
 * cosine) signals into a single ranking.
 *
 * Trigram is paginated — that's the source of "load more" results. Semantic
 * is a one-shot top-K against the search Edge Function. The first page of
 * trigram + the semantic results get blended via combinedScore (above);
 * subsequent trigram pages append in their original order without
 * re-blending (no semantic data exists for items past the first page).
 *
 * `langs` filters the result phrases to those languages. Pass an empty
 * array to search across all langs; both trigram and semantic accept null
 * lang filter and run cross-lingually.
 *
 * Graceful degradation: if the semantic Edge Function fails or
 * search_corpus is empty, the merged list is just trigram. The route never
 * breaks because of the semantic side. Note: only phrase entities returned
 * by semantic are blended into this hook's results; request entities the
 * Edge Function returns are dropped here (route handles them separately).
 */
export function useHybridSearch(
	langs: string[],
	query: string,
	sortBy: SmartSearchSortBy = 'relevance'
) {
	const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS)
	const { data: languagesToShow } = useLanguagesToShow()
	const enabled = !!debouncedQuery && debouncedQuery.length >= MIN_QUERY_LENGTH
	const langsKey = langs.join(',')
	const langFilter = langs.length > 0 ? langs : null

	// 1. Trigram side — paginated.
	const trigramQuery = useInfiniteQuery({
		queryKey: ['hybrid-search-trigram', langsKey, debouncedQuery, sortBy],
		queryFn: async ({ pageParam }): Promise<Array<TrigramRow>> => {
			if (!enabled) return []
			const { data, error } = await supabase.rpc('search_phrases_smart', {
				query: debouncedQuery,
				lang_filter: langFilter,
				sort_by: sortBy,
				result_limit: SEARCH_PAGE_SIZE,
				cursor_created_at: pageParam?.created_at,
				cursor_id: pageParam?.id,
			})
			if (error) throw error
			return (data ?? []) as Array<TrigramRow>
		},
		initialPageParam: null as { created_at: string; id: string } | null,
		getNextPageParam: (lastPage) => {
			if (lastPage.length < SEARCH_PAGE_SIZE) return null
			const lastItem = lastPage[lastPage.length - 1]
			return { created_at: lastItem.created_at, id: lastItem.id }
		},
		enabled,
	})

	// 2. Semantic side — top-K once, no pagination. Failure is non-fatal:
	// the queryFn returns [] on any error so the merged list falls back to
	// trigram-only without bubbling the error up.
	const semanticQuery = useQuery({
		queryKey: ['hybrid-search-semantic', langsKey, debouncedQuery],
		queryFn: async (): Promise<Array<SemanticRow>> => {
			if (!enabled) return []
			const result = await supabase.functions.invoke<Array<SemanticRow>>(
				'search',
				{
					body: {
						langs: langFilter,
						excludeIds: [],
						query: { kind: 'text', text: debouncedQuery },
						limit: SEMANTIC_TOP_K,
					},
				}
			)
			if (result.error) {
				console.warn(
					'search failed; falling back to trigram only',
					result.error
				)
				return []
			}
			return result.data ?? []
		},
		enabled,
		retry: false,
		staleTime: 5 * 60 * 1000,
	})

	// 3. Score-blend (trigram page 1) ∪ (semantic phrases), sort by
	// combinedScore desc, then append remaining trigram pages in their
	// original order (deduped).
	const trigramPages = trigramQuery.data?.pages ?? []
	const trigramFirst = trigramPages[0] ?? []
	const trigramRest = trigramPages.slice(1).flat()
	const semanticPhrases = (semanticQuery.data ?? []).filter(
		(r) => r.entity_type === 'phrase'
	)

	const trigramScoresById = new Map(trigramPages.flat().map((r) => [r.id, r]))
	// Phrase-only — used for blending into the phrase ranking.
	const semanticScoresById = new Map(
		semanticPhrases.map((r) => [r.entity_id, r.score])
	)
	// All entity types — exposed so callers can show diagnostic info on
	// non-phrase result rows (requests, playlists).
	const semanticById = new Map(
		(semanticQuery.data ?? []).map((r) => [r.entity_id, r.score])
	)

	const blendIds = new Set<string>([
		...trigramFirst.map((r) => r.id),
		...semanticPhrases.map((r) => r.entity_id),
	])
	const blendedIds = [...blendIds]
		.map((id) => ({
			id,
			score: combinedScore(
				semanticScoresById.get(id) ?? 0,
				trigramScoresById.get(id)?.similarity_score ?? 0
			),
		}))
		.toSorted((a, b) => b.score - a.score)
		.map(({ id }) => id)

	const tail = trigramRest.map((r) => r.id).filter((id) => !blendIds.has(id))
	const matchingIds = [...blendedIds, ...tail]

	// 4. Hydrate full phrase data from local collection.
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
		const trigramRow = trigramScoresById.get(id)
		const semanticScore = semanticScoresById.get(id) ?? 0
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
		semanticById,
		isLoading:
			trigramQuery.isLoading ||
			trigramQuery.isFetching ||
			semanticQuery.isLoading,
		isEmpty:
			trigramQuery.isSuccess &&
			!semanticQuery.isLoading &&
			matchingIds.length === 0 &&
			!!debouncedQuery,
		error: trigramQuery.error,
		hasNextPage: trigramQuery.hasNextPage,
		fetchNextPage: trigramQuery.fetchNextPage,
		isFetchingNextPage: trigramQuery.isFetchingNextPage,
	}
}
