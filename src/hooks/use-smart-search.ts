import { useInfiniteQuery } from '@tanstack/react-query'
import { useLiveQuery } from '@tanstack/react-db'
import { inArray } from '@tanstack/db'
import { useDebounce } from '@uidotdev/usehooks'

import supabase from '@/lib/supabase-client'
import { phrasesFull } from '@/lib/live-collections'
import { useLanguagesToShow } from '@/hooks/use-profile'
import { splitPhraseTranslations } from '@/hooks/composite-phrase'
import type { PhraseFullFilteredType } from '@/lib/schemas'

export type SmartSearchSortBy = 'relevance' | 'popularity'

interface SearchResultRow {
	id: string
	similarity_score: number
	popularity_score: number
	created_at: string
}

export type SmartSearchResult = PhraseFullFilteredType & {
	similarityScore: number
	popularityScore: number
}

const SEARCH_PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2

/**
 * Smart search hook that uses server-side trigram similarity ranking
 * with cursor-based pagination for infinite scroll.
 *
 * Returns phrase data hydrated from local collections with server-computed scores.
 */
export function useSmartSearch(
	lang: string,
	query: string,
	sortBy: SmartSearchSortBy = 'relevance'
) {
	const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS)
	const { data: languagesToShow } = useLanguagesToShow()

	// Server-side search with cursor-based pagination
	const searchQuery = useInfiniteQuery({
		queryKey: ['smart-search', lang, debouncedQuery, sortBy],
		queryFn: async ({ pageParam }): Promise<Array<SearchResultRow>> => {
			if (!debouncedQuery || debouncedQuery.length < MIN_QUERY_LENGTH) {
				return []
			}

			// Note: search_phrases_smart RPC is defined in migration 20260117150000
			// TypeScript types will be updated after running `pnpm types`
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const { data, error } = await (supabase.rpc as any)(
				'search_phrases_smart',
				{
					query: debouncedQuery,
					lang_filter: lang,
					sort_by: sortBy,
					result_limit: SEARCH_PAGE_SIZE,
					cursor_created_at: pageParam?.created_at ?? null,
					cursor_id: pageParam?.id ?? null,
				}
			)

			if (error) throw error
			return (data ?? []) as Array<SearchResultRow>
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
	const results: Array<SmartSearchResult> = []
	for (const id of matchingIds) {
		const phrase = phrasesQuery.data?.find((p) => p.id === id)
		const scores = allResults.find((r) => r.id === id)
		if (!phrase) continue

		// Split translations by user's known languages
		const phraseFiltered = splitPhraseTranslations(
			phrase,
			languagesToShow ?? []
		)

		results.push({
			...phraseFiltered,
			similarityScore: scores?.similarity_score ?? 0,
			popularityScore: scores?.popularity_score ?? 0,
		})
	}

	return {
		data: results,
		isLoading: searchQuery.isLoading || searchQuery.isFetching,
		isEmpty:
			searchQuery.isSuccess && allResults.length === 0 && !!debouncedQuery,
		error: searchQuery.error,
		// Infinite scroll helpers
		hasNextPage: searchQuery.hasNextPage,
		fetchNextPage: searchQuery.fetchNextPage,
		isFetchingNextPage: searchQuery.isFetchingNextPage,
	}
}
