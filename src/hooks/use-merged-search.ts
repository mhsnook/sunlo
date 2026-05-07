import { useMemo } from 'react'

import { useLocalSearch } from '@/hooks/use-local-search'
import {
	useHybridSearch,
	combinedScore,
	type HybridSearchResult,
} from '@/hooks/use-hybrid-search'
import { LOCAL_ONLY_TRIGRAM_SCORE } from '@/hooks/search-config'
import { splitPhraseTranslations } from '@/hooks/composite-phrase'
import { useLanguagesToShow } from '@/features/profile/hooks'
import type { PhrasePlaylistType } from '@/features/playlists/schemas'
import type { PhraseRequestType } from '@/features/requests/schemas'

// Top-level search hook used by /search and BrowseSearchOverlay. Composes
// useLocalSearch (instant in-memory) + useHybridSearch (server-blended)
// and emits a single ranked merged list across all entity types — sorted
// by combinedScore so /search/test diagnostic numbers correspond to the
// actual ordering on every surface.
//
// Local-only matches (entries useLocalSearch surfaced but the server
// hasn't / didn't) get a synthetic trigram score so they stay visible
// during the debounce window and when search_corpus is empty. As soon
// as the server returns, real scores supersede the synthetic ones.

export type MergedSearchItem = {
	id: string
	score: number
	semanticScore: number
	trigramScore: number
} & (
	| { type: 'phrase'; entity: HybridSearchResult }
	| { type: 'playlist'; entity: PhrasePlaylistType }
	| { type: 'request'; entity: PhraseRequestType }
)

const LOCAL_LIMIT = 50

export function useMergedSearch(langs: string[], query: string) {
	const langFilter = langs.length > 0 ? langs : null

	const local = useLocalSearch(langFilter, query, { limit: LOCAL_LIMIT })
	const hybrid = useHybridSearch(langs, query)
	const { data: languagesToShow } = useLanguagesToShow()

	const items = useMemo((): Array<MergedSearchItem> => {
		const byId = new Map<string, MergedSearchItem>()

		for (const phrase of hybrid.data) {
			byId.set(phrase.id, {
				type: 'phrase',
				id: phrase.id,
				entity: phrase,
				score: phrase.combinedScore,
				semanticScore: phrase.semanticScore,
				trigramScore: phrase.similarityScore,
			})
		}

		for (const phrase of local.phrases) {
			if (byId.has(phrase.id)) continue
			const filtered = splitPhraseTranslations(phrase, languagesToShow ?? [])
			const score = combinedScore(0, LOCAL_ONLY_TRIGRAM_SCORE)
			byId.set(phrase.id, {
				type: 'phrase',
				id: phrase.id,
				entity: {
					...filtered,
					semanticScore: 0,
					similarityScore: LOCAL_ONLY_TRIGRAM_SCORE,
					combinedScore: score,
				},
				score,
				semanticScore: 0,
				trigramScore: LOCAL_ONLY_TRIGRAM_SCORE,
			})
		}

		for (const playlist of local.playlists) {
			const semantic = hybrid.semanticById.get(playlist.id) ?? 0
			const trigram =
				hybrid.trigramById.get(playlist.id) ?? LOCAL_ONLY_TRIGRAM_SCORE
			byId.set(playlist.id, {
				type: 'playlist',
				id: playlist.id,
				entity: playlist,
				score: combinedScore(semantic, trigram),
				semanticScore: semantic,
				trigramScore: trigram,
			})
		}

		for (const request of local.requests) {
			const semantic = hybrid.semanticById.get(request.id) ?? 0
			const trigram =
				hybrid.trigramById.get(request.id) ?? LOCAL_ONLY_TRIGRAM_SCORE
			byId.set(request.id, {
				type: 'request',
				id: request.id,
				entity: request,
				score: combinedScore(semantic, trigram),
				semanticScore: semantic,
				trigramScore: trigram,
			})
		}

		return [...byId.values()].toSorted((a, b) => b.score - a.score)
	}, [
		hybrid.data,
		hybrid.semanticById,
		hybrid.trigramById,
		local.phrases,
		local.playlists,
		local.requests,
		languagesToShow,
	])

	return {
		items,
		isLoading: hybrid.isLoading,
		isEmpty: hybrid.isEmpty && items.length === 0,
		hasNextPage: hybrid.hasNextPage,
		fetchNextPage: hybrid.fetchNextPage,
		isFetchingNextPage: hybrid.isFetchingNextPage,
		error: hybrid.error,
		// Per-entity diagnostic Maps from the hybrid layer — re-exposed so
		// /search/test can render score breakdowns without a second hook
		// call.
		semanticById: hybrid.semanticById,
		trigramById: hybrid.trigramById,
	}
}
