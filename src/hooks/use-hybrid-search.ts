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
	entity_type: 'phrase' | 'request'
	entity_id: string
	id: string // duplicate of entity_id; kept for legacy chat-client compat
	score: number
}

export type HybridSearchResult = PhraseFullFilteredType & {
	similarityScore: number // trigram (0..1)
	popularityScore: number
	semanticScore: number // cosine (0..1), 0 if not surfaced by semantic
}

const SEARCH_PAGE_SIZE = 20
const SEMANTIC_TOP_K = 20
const SEARCH_DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2
const RRF_K = 60

/**
 * Reciprocal rank fusion across multiple rankings of phrase IDs. Each ranking
 * is a top-down list (best first). Items appearing in multiple rankings get
 * their RRF contributions summed. Returns ID → fused score, ordered desc.
 *
 * Standard k=60 from the original RRF paper. No score-scale normalization
 * needed, which is the reason RRF is the right tool here (trigram similarity
 * and cosine similarity are not directly comparable).
 */
function reciprocalRankFusion(
	rankings: Array<Array<string>>,
	k = RRF_K
): Map<string, number> {
	const scores = new Map<string, number>()
	for (const ranking of rankings) {
		ranking.forEach((id, idx) => {
			const rank = idx + 1
			scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank))
		})
	}
	return scores
}

/**
 * Hybrid smart search for phrases: drop-in for the legacy `useSmartSearch`
 * but blends trigram (lexical) and semantic (BGE-M3 cosine) rankings.
 *
 * Trigram is paginated — that's the source of "load more" results. Semantic
 * is a one-shot top-K against the chat-search Edge Function. RRF merges the
 * trigram first page with the semantic results to compute the visible
 * ordering; subsequent trigram pages append directly without re-blending.
 *
 * `langs` filters the result phrases to those languages. Pass an empty
 * array (or skip) to opt out — but for `/search` and friends the caller
 * should usually pass the user's deck languages or the chip-selected
 * languages. The trigram RPC takes a single lang for now (uses the first
 * element); the semantic side fully respects the array.
 *
 * Graceful degradation: if the semantic Edge Function fails or
 * search_corpus is empty, the merged list is just trigram. The route never
 * breaks because of the semantic side. Note: only phrase entities returned
 * by semantic are blended into this hook's results; request entities the
 * Edge Function returns are dropped here (route handles them separately).
 */
export function useHybridSmartSearch(
	langs: string[],
	query: string,
	sortBy: SmartSearchSortBy = 'relevance'
) {
	const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS)
	const { data: languagesToShow } = useLanguagesToShow()
	const enabled = !!debouncedQuery && debouncedQuery.length >= MIN_QUERY_LENGTH
	const langsKey = langs.join(',')
	const primaryLang = langs[0] ?? ''

	// 1. Trigram side — paginated. The current trigram RPC takes a single
	// lang; pass the first selected lang. (When `search_phrases_smart`
	// learns multi-lang, swap to passing the array.)
	const trigramQuery = useInfiniteQuery({
		queryKey: ['hybrid-search-trigram', primaryLang, debouncedQuery, sortBy],
		queryFn: async ({ pageParam }): Promise<Array<TrigramRow>> => {
			if (!enabled) return []
			const { data, error } = await supabase.rpc('search_phrases_smart', {
				query: debouncedQuery,
				lang_filter: primaryLang,
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
				'chat-search',
				{
					body: {
						langs: langs.length > 0 ? langs : null,
						excludeIds: [],
						query: { kind: 'text', text: debouncedQuery },
						limit: SEMANTIC_TOP_K,
					},
				}
			)
			if (result.error) {
				console.warn(
					'chat-search failed; falling back to trigram only',
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

	// 3. RRF blend of (trigram page 1) + semantic-phrase-results, then
	// append remaining trigram pages in their original order (deduped).
	// Request entities from the semantic side are dropped here — the route
	// renders requests separately (and the trigram side has no request
	// matches at all today).
	const trigramPages = trigramQuery.data?.pages ?? []
	const trigramFirst = trigramPages[0] ?? []
	const trigramRest = trigramPages.slice(1).flat()
	const semanticPhrases = (semanticQuery.data ?? [])
		.filter((r) => r.entity_type === 'phrase')
		.slice(0, SEMANTIC_TOP_K)

	const blended = reciprocalRankFusion([
		trigramFirst.map((r) => r.id),
		semanticPhrases.map((r) => r.entity_id),
	])
	const blendedIds = Array.from(blended.entries())
		.toSorted((a, b) => b[1] - a[1])
		.map(([id]) => id)

	const seen = new Set(blendedIds)
	const tail = trigramRest.map((r) => r.id).filter((id) => !seen.has(id))
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

	const trigramScoresById = new Map(trigramPages.flat().map((r) => [r.id, r]))
	const semanticScoresById = new Map(
		semanticPhrases.map((r) => [r.entity_id, r.score])
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
		results.push({
			...phraseFiltered,
			similarityScore: trigramRow?.similarity_score ?? 0,
			popularityScore: trigramRow?.popularity_score ?? 0,
			semanticScore: semanticScoresById.get(id) ?? 0,
		})
	}

	return {
		data: results,
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
