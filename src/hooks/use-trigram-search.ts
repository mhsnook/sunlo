import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'

import supabase from '@/lib/supabase-client'

// One layer of the search stack: hits search_phrases_smart (pg_trgm-based
// fuzzy phrase search). Phrase-only — the trigram index doesn't cover
// requests or playlists. Cursor-paginated for "load more". Composed by
// useHybridSearch for the /search route.

export type TrigramRow = {
	id: string
	similarity_score: number
	popularity_score: number
	created_at: string
}

export type TrigramSortBy = 'relevance' | 'popularity'

const DEFAULT_PAGE_SIZE = 20
const MIN_QUERY_LENGTH = 2
const EMPTY_PAGES: Array<Array<TrigramRow>> = []

export function useTrigramSearch(
	langs: string[] | null,
	query: string,
	opts: {
		sortBy?: TrigramSortBy
		enabled?: boolean
		pageSize?: number
	} = {}
) {
	const {
		sortBy = 'relevance',
		enabled = true,
		pageSize = DEFAULT_PAGE_SIZE,
	} = opts

	const langsKey = langs?.join(',') ?? 'all'
	const finalEnabled = enabled && query.length >= MIN_QUERY_LENGTH

	const result = useInfiniteQuery({
		queryKey: ['trigram-search', langsKey, query, sortBy, pageSize],
		queryFn: async ({ pageParam }): Promise<Array<TrigramRow>> => {
			if (!finalEnabled) return []
			const { data, error } = await supabase.rpc('search_phrases_smart', {
				query,
				lang_filter: langs,
				sort_by: sortBy,
				result_limit: pageSize,
				cursor_created_at: pageParam?.created_at,
				cursor_id: pageParam?.id,
			})
			if (error) throw error
			return (data ?? []) as Array<TrigramRow>
		},
		initialPageParam: null as { created_at: string; id: string } | null,
		getNextPageParam: (lastPage) => {
			if (lastPage.length < pageSize) return null
			const lastItem = lastPage[lastPage.length - 1]
			return { created_at: lastItem.created_at, id: lastItem.id }
		},
		enabled: finalEnabled,
	})

	const pagesData = result.data?.pages
	const pages = pagesData ?? EMPTY_PAGES
	const rows = useMemo(() => (pagesData ?? EMPTY_PAGES).flat(), [pagesData])
	const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows])

	return {
		pages,
		rows,
		byId,
		hasNextPage: result.hasNextPage,
		fetchNextPage: result.fetchNextPage,
		isFetchingNextPage: result.isFetchingNextPage,
		isLoading: result.isLoading,
		isFetching: result.isFetching,
		isSuccess: result.isSuccess,
		error: result.error,
	}
}
