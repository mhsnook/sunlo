import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'

import supabase from '@/lib/supabase-client'
import type { SearchEntityType } from '@/hooks/use-semantic-search'

// One layer of the search stack: hits search_by_trigram (pg_trgm-based
// fuzzy search across search_corpus). Returns multi-entity rows
// (phrases, requests, playlists) — same row shape as useSemanticSearch
// for parallel composition in useHybridSearch. Cursor-paginated for
// "load more".

export type TrigramRow = {
	entity_type: SearchEntityType
	entity_id: string
	matched_via: 'phrase' | 'translation' | 'request' | 'playlist'
	matched_text: string
	matched_lang: string
	similarity: number
	created_at: string
}

const DEFAULT_PAGE_SIZE = 20
const MIN_QUERY_LENGTH = 2
const EMPTY_PAGES: Array<Array<TrigramRow>> = []

export function useTrigramSearch(
	langs: string[] | null,
	query: string,
	opts: { enabled?: boolean; pageSize?: number } = {}
) {
	const { enabled = true, pageSize = DEFAULT_PAGE_SIZE } = opts

	const langsKey = langs?.join(',') ?? 'all'
	const finalEnabled = enabled && query.length >= MIN_QUERY_LENGTH

	const result = useInfiniteQuery({
		queryKey: ['trigram-search', langsKey, query, pageSize],
		queryFn: async ({ pageParam }): Promise<Array<TrigramRow>> => {
			if (!finalEnabled) return []
			const { data, error } = await supabase.rpc('search_by_trigram', {
				query,
				target_langs: langs,
				match_limit: pageSize,
				cursor_created_at: pageParam?.created_at,
				cursor_id: pageParam?.entity_id,
			})
			if (error) throw error
			return (data ?? []) as Array<TrigramRow>
		},
		initialPageParam: null as { created_at: string; entity_id: string } | null,
		getNextPageParam: (lastPage) => {
			if (lastPage.length < pageSize) return null
			const lastItem = lastPage[lastPage.length - 1]
			return { created_at: lastItem.created_at, entity_id: lastItem.entity_id }
		},
		enabled: finalEnabled,
	})

	const pagesData = result.data?.pages
	const pages = pagesData ?? EMPTY_PAGES
	const rows = useMemo(() => (pagesData ?? EMPTY_PAGES).flat(), [pagesData])
	const byId = useMemo(() => new Map(rows.map((r) => [r.entity_id, r])), [rows])

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
