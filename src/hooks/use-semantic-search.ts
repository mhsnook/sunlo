import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import supabase from '@/lib/supabase-client'

// One layer of the search stack: hits the `search` Edge Function and returns
// raw entity results (phrases, requests, playlists). Composed by
// `useHybridSearch` for the /search route and called directly by the chat
// client (via runSemanticSearch in features/chat/api.ts).
//
// Two query modes:
//   - 'text'   — caller passes a string; edge function embeds it via
//                Workers AI BGE-M3 (or hits the embedding cache) and runs
//                cosine similarity against search_corpus.
//   - 'anchor' — caller passes entity_ids; edge function averages their
//                stored embeddings server-side. No Workers AI call.

export type SemanticEntityType = 'phrase' | 'request' | 'playlist'

export type SemanticResult = {
	entity_type: SemanticEntityType
	entity_id: string
	lang: string
	text: string
	score: number
	translations: Array<{ id: string; lang: string; text: string }>
	description?: string | null
}

export type SemanticQuery =
	| { kind: 'text'; text: string }
	| { kind: 'anchor'; ids: string[] }

export type SemanticSearchOpts = {
	excludeIds?: string[]
	limit?: number
}

const DEFAULT_LIMIT = 20
const STALE_TIME_MS = 5 * 60 * 1000
const EMPTY_RESULTS: Array<SemanticResult> = []

/**
 * Plain async function — invokes the search Edge Function directly. Use for
 * imperative call sites (chat submit handlers, mutation onClick) where a
 * hook doesn't fit. For reactive search-as-you-type, use useSemanticSearch.
 */
export async function runSemanticSearch(
	langs: string[] | null,
	query: SemanticQuery,
	opts: SemanticSearchOpts = {}
): Promise<Array<SemanticResult>> {
	const { excludeIds = [], limit = DEFAULT_LIMIT } = opts
	const result = await supabase.functions.invoke<Array<SemanticResult>>(
		'search',
		{
			body: { langs, query, excludeIds, limit },
		}
	)
	if (result.error) {
		throw new Error(`semantic search failed: ${String(result.error)}`)
	}
	return result.data ?? []
}

/**
 * React hook around runSemanticSearch. Caches results in TanStack Query;
 * fires when the query is non-empty. On error, logs a warning and returns
 * an empty array — semantic failure should degrade gracefully (callers can
 * still surface trigram/local results).
 */
export function useSemanticSearch(
	langs: string[] | null,
	query: SemanticQuery,
	opts: SemanticSearchOpts & { enabled?: boolean } = {}
) {
	const { enabled = true, excludeIds = [], limit = DEFAULT_LIMIT } = opts

	const isQueryNonEmpty =
		query.kind === 'text' ? query.text.length >= 2 : query.ids.length > 0
	const finalEnabled = enabled && isQueryNonEmpty

	const queryKey = useMemo(
		() => makeQueryKey(langs, query, excludeIds, limit),
		[langs, query, excludeIds, limit]
	)

	const result = useQuery({
		queryKey,
		queryFn: async () => {
			try {
				return await runSemanticSearch(langs, query, { excludeIds, limit })
			} catch (err) {
				console.warn('semantic search failed; returning empty list', err)
				return []
			}
		},
		enabled: finalEnabled,
		retry: false,
		staleTime: STALE_TIME_MS,
	})

	const byId = useMemo(
		() => new Map((result.data ?? []).map((r) => [r.entity_id, r])),
		[result.data]
	)

	return {
		data: result.data ?? EMPTY_RESULTS,
		byId,
		isLoading: result.isLoading,
		isFetching: result.isFetching,
		error: result.error,
	}
}

function makeQueryKey(
	langs: string[] | null,
	query: SemanticQuery,
	excludeIds: string[],
	limit: number
) {
	const langKey = langs?.join(',') ?? 'all'
	const qKey =
		query.kind === 'text'
			? `text:${query.text}`
			: `anchor:${[...query.ids].toSorted().join(',')}`
	const excludeKey = [...excludeIds].toSorted().join(',')
	return ['semantic-search', langKey, qKey, excludeKey, limit]
}
