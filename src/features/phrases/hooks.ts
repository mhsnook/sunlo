import { and, eq, ilike, inArray } from '@tanstack/db'
import { useLiveQuery } from '@tanstack/react-db'

import type { pids, UseLiveQueryResult, uuid } from '@/types/main'
import type {
	PhraseFullFilteredType,
	PhraseFullFullType,
	PhraseFullType,
} from './schemas'
import { phrasesCollection } from './collections'
import { phrasesFull } from './live'
import {
	playlistPhraseLinksCollection,
	phrasePlaylistsCollection,
} from '@/features/playlists/collections'
import {
	commentPhraseLinksCollection,
	commentsCollection,
} from '@/features/comments/collections'
import { phraseRequestsCollection } from '@/features/requests/collections'
import { useLanguagesToShow } from '@/features/profile/hooks'
import { splitPhraseTranslations } from '@/hooks/composite-phrase'
import { useUserId } from '@/lib/use-auth'

export const useLanguagePhrases = (
	lang: string
): UseLiveQueryResult<PhraseFullType[]> =>
	useLiveQuery(
		(q) =>
			q
				.from({ phrase: phrasesFull })
				.where(({ phrase }) => eq(phrase.lang, lang)),
		[lang]
	)

/**
 * Phrases for a language, straight off `phrasesCollection` (no profile/card join).
 * Use this when you only need raw phrase metadata — charts, manage-deck, etc.
 */
export const useLangPhrasesRaw = (
	lang: string
): UseLiveQueryResult<PhraseFullType[]> =>
	useLiveQuery(
		(q) =>
			q
				.from({ phrase: phrasesCollection })
				.where(({ phrase }) => eq(phrase.lang, lang)),
		[lang]
	)

/** A single phrase by id from the raw `phrasesCollection`. */
export const useOnePhrase = (
	pid: uuid | undefined | null
): UseLiveQueryResult<PhraseFullType> =>
	useLiveQuery(
		(q) =>
			!pid ? undefined : (
				q
					.from({ phrase: phrasesCollection })
					.where(({ phrase }) => eq(phrase.id, pid))
					.findOne()
			),
		[pid]
	)

export const useLanguagePhrasesSearch = (
	lang: string | undefined,
	queryString: string | undefined,
	tags?: string[] | null,
	filteredPids?: pids | null
): UseLiveQueryResult<PhraseFullFilteredType[]> => {
	const { data: langs } = useLanguagesToShow()
	return useLiveQuery(
		(q) => {
			if (!queryString && !tags?.length && !filteredPids) {
				return undefined
			}
			let query = q.from({ phrase: phrasesFull })
			if (lang) {
				query = query.where(({ phrase }) => eq(phrase.lang, lang))
			}
			if (queryString) {
				query = query.where(({ phrase }) =>
					ilike(phrase.searchableText, `%${queryString}%`)
				)
			}
			if (filteredPids) {
				query = query.where(({ phrase }) => inArray(phrase.id, filteredPids))
			}
			if (tags?.length) {
				query = query.fn.where(({ phrase }) => {
					if (!phrase?.tags) return false
					return tags.every((selectedTag) =>
						(phrase.tags ?? []).some(
							(phraseTag) => phraseTag?.name === selectedTag
						)
					)
				})
			}
			return query.fn.select(({ phrase }) =>
				splitPhraseTranslations(phrase, langs)
			)
		},
		[lang, queryString, tags, filteredPids, langs]
	)
}

export const useLanguagePhrase = (
	pid: uuid | null | undefined
): UseLiveQueryResult<PhraseFullFullType> =>
	useLiveQuery(
		(q) =>
			!pid ? undefined : (
				q
					.from({ phrase: phrasesFull })
					.where(({ phrase }) => eq(phrase.id, pid))
					.findOne()
			),
		[pid]
	)

export function useAllMyPhrasesLang(
	lang: string
): UseLiveQueryResult<PhraseFullType[]> {
	const userId = useUserId()
	return useLiveQuery(
		(q) =>
			q
				.from({ phrase: phrasesFull })
				.where(({ phrase }) =>
					and(eq(phrase.added_by, userId), eq(phrase.lang, lang))
				)
				.orderBy(({ phrase }) => phrase.created_at, 'desc'),
		[userId, lang]
	)
}

// Provenance types for phrase metadata
export interface PhraseProvenancePlaylist {
	type: 'playlist'
	id: uuid
	playlistId: uuid
	title: string
	description: string | null
	href: string | null
	created_at: string
	uid: uuid
}

export interface PhraseProvenanceComment {
	type: 'comment'
	id: uuid
	commentId: uuid
	requestId: uuid
	prompt: string
	created_at: string
	uid: uuid
}

export type PhraseProvenanceItem =
	| PhraseProvenancePlaylist
	| PhraseProvenanceComment

/**
 * Get playlists that contain this phrase
 */
export function usePhrasePlaylists(
	phraseId: uuid
): UseLiveQueryResult<PhraseProvenancePlaylist[]> {
	return useLiveQuery(
		(q) =>
			q
				.from({ link: playlistPhraseLinksCollection })
				.join(
					{ playlist: phrasePlaylistsCollection },
					({ link, playlist }) => eq(link.playlist_id, playlist.id),
					'inner'
				)
				.where(({ link, playlist }) =>
					and(eq(link.phrase_id, phraseId), eq(playlist.deleted, false))
				)
				.select(({ playlist, link }) => ({
					type: 'playlist' as const,
					id: link.id,
					playlistId: playlist.id,
					title: playlist.title,
					description: playlist.description,
					href: link.href,
					created_at: link.created_at,
					uid: playlist.uid,
				})),
		[phraseId]
	)
}

/**
 * Get comments that mention this phrase
 */
export function usePhraseComments(
	phraseId: uuid
): UseLiveQueryResult<PhraseProvenanceComment[]> {
	return useLiveQuery(
		(q) =>
			q
				.from({ link: commentPhraseLinksCollection })
				.join(
					{ comment: commentsCollection },
					({ link, comment }) => eq(link.comment_id, comment.id),
					'inner'
				)
				.join(
					{ request: phraseRequestsCollection },
					({ comment, request }) => eq(comment.request_id, request.id),
					'inner'
				)
				.where(({ link, request }) =>
					and(eq(link.phrase_id, phraseId), eq(request.deleted, false))
				)
				.select(({ comment, request, link }) => ({
					type: 'comment' as const,
					id: link.id,
					commentId: comment.id,
					requestId: request.id,
					prompt: request.prompt,
					created_at: comment.created_at,
					uid: comment.uid,
				})),
		[phraseId]
	)
}

// Types for related cards
export interface RelatedCardSource {
	type: 'playlist' | 'thread'
	id: uuid // playlistId or requestId
	label: string // playlist title or request prompt
}

export interface RelatedCard {
	phraseId: uuid
	sources: RelatedCardSource[]
}

/**
 * Get phrases related to this one via shared playlists or request threads.
 * Returns deduplicated phrase IDs with source metadata.
 */
export function useRelatedCards(phraseId: uuid): RelatedCard[] {
	const { data: playlists } = usePhrasePlaylists(phraseId)
	const { data: comments } = usePhraseComments(phraseId)

	const playlistIds = (playlists ?? []).map((p) => p.playlistId)
	const requestIds = [...new Set((comments ?? []).map((c) => c.requestId))]

	// Get sibling phrases from the same playlists
	const { data: playlistSiblings } = useLiveQuery(
		(q) =>
			playlistIds.length === 0 ?
				undefined
			:	q
					.from({ link: playlistPhraseLinksCollection })
					.join(
						{ playlist: phrasePlaylistsCollection },
						({ link, playlist }) => eq(link.playlist_id, playlist.id),
						'inner'
					)
					.where(({ link }) => inArray(link.playlist_id, playlistIds))
					.select(({ link, playlist }) => ({
						phraseId: link.phrase_id,
						playlistId: playlist.id,
						title: playlist.title,
					})),
		[playlistIds.join(',')]
	)

	// Get sibling phrases from the same request threads
	const { data: threadSiblings } = useLiveQuery(
		(q) =>
			requestIds.length === 0 ?
				undefined
			:	q
					.from({ link: commentPhraseLinksCollection })
					.join(
						{ request: phraseRequestsCollection },
						({ link, request }) => eq(link.request_id, request.id),
						'inner'
					)
					.where(({ link }) => inArray(link.request_id, requestIds))
					.select(({ link, request }) => ({
						phraseId: link.phrase_id,
						requestId: request.id,
						prompt: request.prompt,
					})),
		[requestIds.join(',')]
	)

	// Merge into a map of phraseId -> sources, excluding the current phrase
	const sourceMap = new Map<uuid, RelatedCardSource[]>()

	for (const s of playlistSiblings ?? []) {
		if (s.phraseId === phraseId) continue
		const sources = sourceMap.get(s.phraseId) ?? []
		if (!sources.some((x) => x.type === 'playlist' && x.id === s.playlistId)) {
			sources.push({ type: 'playlist', id: s.playlistId, label: s.title })
		}
		sourceMap.set(s.phraseId, sources)
	}

	for (const s of threadSiblings ?? []) {
		if (s.phraseId === phraseId) continue
		const sources = sourceMap.get(s.phraseId) ?? []
		if (!sources.some((x) => x.type === 'thread' && x.id === s.requestId)) {
			sources.push({ type: 'thread', id: s.requestId, label: s.prompt })
		}
		sourceMap.set(s.phraseId, sources)
	}

	return [...sourceMap.entries()].map(([phraseId, sources]) => ({
		phraseId,
		sources,
	}))
}

/**
 * Get all provenance items (playlists + comments) sorted by date
 */
export function usePhraseProvenance(phraseId: uuid) {
	const { data: playlists } = usePhrasePlaylists(phraseId)
	const { data: comments } = usePhraseComments(phraseId)

	const items: PhraseProvenanceItem[] = [
		...(playlists ?? []),
		...(comments ?? []),
	].toSorted(
		(a, b) =>
			new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
	)
	return items
}
