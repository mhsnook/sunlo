import { useInfiniteQuery } from '@tanstack/react-query'
import { useLiveQuery } from '@tanstack/react-db'
import { inArray } from '@tanstack/db'
import { useDebounce } from '@uidotdev/usehooks'

import supabase from '@/lib/supabase-client'
import { phrasesFull } from '@/lib/live-collections'
import { useLanguagesToShow } from '@/hooks/use-profile'
import { splitPhraseTranslations } from '@/hooks/composite-phrase'
import type { PhraseFullFilteredType } from '@/lib/schemas'

export type HybridSearchSortBy = 'relevance' | 'popularity'

interface HybridSearchResultRow {
	id: string
	trigram_score: number
	semantic_score: number
	combined_score: number
	popularity_score: number
	created_at: string
}

export type HybridSearchResult = PhraseFullFilteredType & {
	trigramScore: number
	semanticScore: number
	combinedScore: number
	popularityScore: number
}

const SEARCH_PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2

/**
 * Hybrid search hook combining trigram + semantic vector search.
 *
 * Uses the search-hybrid Edge Function which:
 * 1. Generates a query embedding via the embedding API
 * 2. Runs hybrid search RPC (trigram + vector + RRF fusion)
 * 3. Returns ranked results
 *
 * Falls back gracefully to trigram-only if embeddings are unavailable.
 * Drop-in replacement for useSmartSearch with the same return shape.
 */
export function useHybridSearch(
	lang: string,
	query: string,
	sortBy: HybridSearchSortBy = 'relevance'
) {
	const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS)
	const { data: languagesToShow } = useLanguagesToShow()

	const searchQuery = useInfiniteQuery({
		queryKey: ['hybrid-search', lang, debouncedQuery, sortBy],
		queryFn: async ({ pageParam }): Promise<Array<HybridSearchResultRow>> => {
			if (!debouncedQuery || debouncedQuery.length < MIN_QUERY_LENGTH) {
				return []
			}

			const response = await supabase.functions.invoke<{
				data: Array<HybridSearchResultRow>
			}>('search-hybrid', {
				body: {
					query: debouncedQuery,
					lang,
					semantic_weight: sortBy === 'relevance' ? 0.5 : 0.3,
					limit: SEARCH_PAGE_SIZE,
					cursor_created_at: pageParam?.created_at ?? null,
					cursor_id: pageParam?.id ?? null,
				},
			})

			if (response.error) {
				const err = response.error as { message?: string }
				throw new Error(err.message ?? 'Search request failed')
			}
			return response.data?.data ?? []
		},
		initialPageParam: null as { created_at: string; id: string } | null,
		getNextPageParam: (lastPage) => {
			if (lastPage.length < SEARCH_PAGE_SIZE) return null
			const lastItem = lastPage[lastPage.length - 1]
			return { created_at: lastItem.created_at, id: lastItem.id }
		},
		enabled: !!debouncedQuery && debouncedQuery.length >= MIN_QUERY_LENGTH,
	})

	// Flatten all pages into a single array of results
	const allResults = searchQuery.data?.pages.flat() ?? []
	const matchingIds = allResults.map((r) => r.id)

	// Hydrate full phrase data from local collection
	const phrasesQuery = useLiveQuery(
		(q) => {
			if (!matchingIds.length) return undefined
			return q
				.from({ phrase: phrasesFull })
				.where(({ phrase }) => inArray(phrase.id, matchingIds))
		},
		[matchingIds.join(',')]
	)

	// Merge server scores with local phrase data, preserve server ordering
	const results: Array<HybridSearchResult> = []
	for (const id of matchingIds) {
		const phrase = phrasesQuery.data?.find((p) => p.id === id)
		const scores = allResults.find((r) => r.id === id)
		if (!phrase) continue

		const phraseFiltered = splitPhraseTranslations(
			phrase,
			languagesToShow ?? []
		)

		results.push({
			...phraseFiltered,
			trigramScore: scores?.trigram_score ?? 0,
			semanticScore: scores?.semantic_score ?? 0,
			combinedScore: scores?.combined_score ?? 0,
			popularityScore: scores?.popularity_score ?? 0,
		})
	}

	return {
		data: results,
		isLoading: searchQuery.isLoading || searchQuery.isFetching,
		isEmpty:
			searchQuery.isSuccess && allResults.length === 0 && !!debouncedQuery,
		error: searchQuery.error,
		hasNextPage: searchQuery.hasNextPage,
		fetchNextPage: searchQuery.fetchNextPage,
		isFetchingNextPage: searchQuery.isFetchingNextPage,
	}
}
