import { useMemo } from 'react'
import { useLiveQuery } from '@tanstack/react-db'

import { phrasesFull } from '@/features/phrases/live'
import { phrasePlaylistsActive } from '@/features/playlists/live'
import { phraseRequestsActive } from '@/features/requests/live'
import { MIN_QUERY_LENGTH } from '@/hooks/search-config'

import type { PhraseFullFullType } from '@/features/phrases'
import type { PhrasePlaylistType } from '@/features/playlists'
import type { PhraseRequestType } from '@/features/requests'

// In-memory search across the locally-cached collections (phrases,
// playlists, requests). Synchronous-feeling: results update as soon as
// the underlying collections do, no network round-trip. Used for instant
// "as-you-type" feedback layered above the slower server-backed hybrid
// search, and as the offline / edge-function-failed fallback.
//
// Phrases match against searchableText (phrase text + translations + tag
// names, joined). Playlists match against title + description. Requests
// match against prompt. All matches are case-insensitive substring.
//
// `langs` filters by entity lang when set; null/empty array searches all.

export type LocalSearchResults = {
	phrases: Array<PhraseFullFullType>
	playlists: Array<PhrasePlaylistType>
	requests: Array<PhraseRequestType>
}

export type LocalSearchOpts = {
	enabled?: boolean
	limit?: number
	types?: { phrases?: boolean; playlists?: boolean; requests?: boolean }
}

const DEFAULT_LIMIT = 20
const ALL_TYPES = { phrases: true, playlists: true, requests: true }

const EMPTY_PHRASES: Array<PhraseFullFullType> = []
const EMPTY_PLAYLISTS: Array<PhrasePlaylistType> = []
const EMPTY_REQUESTS: Array<PhraseRequestType> = []

export function useLocalSearch(
	langs: string[] | null,
	query: string,
	opts: LocalSearchOpts = {}
): LocalSearchResults {
	const { enabled = true, limit = DEFAULT_LIMIT, types = ALL_TYPES } = opts

	const enabledNow = enabled && query.length >= MIN_QUERY_LENGTH
	const lowerQuery = query.toLowerCase()
	const langSet = langs && langs.length > 0 ? new Set(langs) : null
	const langsKey = langSet ? [...langSet].toSorted().join(',') : ''

	const phrasesResult = useLiveQuery(
		(q) => {
			if (!enabledNow || !types.phrases) return undefined
			return q.from({ phrase: phrasesFull }).fn.where(({ phrase }) => {
				if (langSet && !langSet.has(phrase.lang)) return false
				return phrase.searchableText.toLowerCase().includes(lowerQuery)
			})
		},
		[enabledNow, types.phrases, lowerQuery, langsKey]
	)

	const playlistsResult = useLiveQuery(
		(q) => {
			if (!enabledNow || !types.playlists) return undefined
			return q
				.from({ playlist: phrasePlaylistsActive })
				.fn.where(({ playlist }) => {
					if (langSet && !langSet.has(playlist.lang)) return false
					const haystack = [playlist.title, playlist.description ?? '']
						.join(' ')
						.toLowerCase()
					return haystack.includes(lowerQuery)
				})
		},
		[enabledNow, types.playlists, lowerQuery, langsKey]
	)

	const requestsResult = useLiveQuery(
		(q) => {
			if (!enabledNow || !types.requests) return undefined
			return q.from({ req: phraseRequestsActive }).fn.where(({ req }) => {
				if (langSet && !langSet.has(req.lang)) return false
				return req.prompt.toLowerCase().includes(lowerQuery)
			})
		},
		[enabledNow, types.requests, lowerQuery, langsKey]
	)

	return useMemo(
		() => ({
			phrases: enabledNow
				? (phrasesResult.data?.slice(0, limit) ?? EMPTY_PHRASES)
				: EMPTY_PHRASES,
			playlists: enabledNow
				? (playlistsResult.data?.slice(0, limit) ?? EMPTY_PLAYLISTS)
				: EMPTY_PLAYLISTS,
			requests: enabledNow
				? (requestsResult.data?.slice(0, limit) ?? EMPTY_REQUESTS)
				: EMPTY_REQUESTS,
		}),
		[
			enabledNow,
			limit,
			phrasesResult.data,
			playlistsResult.data,
			requestsResult.data,
		]
	)
}
