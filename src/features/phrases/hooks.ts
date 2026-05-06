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
			!pid
				? undefined
				: q
						.from({ phrase: phrasesCollection })
						.where(({ phrase }) => eq(phrase.id, pid))
						.findOne(),
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
			!pid
				? undefined
				: q
						.from({ phrase: phrasesFull })
						.where(({ phrase }) => eq(phrase.id, pid))
						.findOne(),
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

export function useAnyonesPhrases(
	uid: uuid,
	lang?: string
): UseLiveQueryResult<PhraseFullFullType[]> {
	return useLiveQuery(
		(q) => {
			let query = q
				.from({ phrase: phrasesFull })
				.where(({ phrase }) => eq(phrase.added_by, uid))
			if (lang) query = query.where(({ phrase }) => eq(phrase.lang, lang))
			return query.orderBy(({ phrase }) => phrase.created_at, 'desc')
		},
		[lang, uid]
	)
}

// Provenance types for phrase metadata
export interface PhraseProvenancePlaylistRow {
	type: 'playlist'
	id: uuid
	playlistId: uuid
	title: string
	description: string | null
	href: string | null
	created_at: string
	uid: uuid
}

export interface PhraseProvenanceCommentRow {
	type: 'comment'
	id: uuid
	commentId: uuid
	requestId: uuid
	prompt: string
	created_at: string
	uid: uuid
}

export type PhraseProvenancePlaylist = PhraseProvenancePlaylistRow & {
	siblings: uuid[]
}
export type PhraseProvenanceComment = PhraseProvenanceCommentRow & {
	siblings: uuid[]
}

export type PhraseProvenanceItem =
	| PhraseProvenancePlaylist
	| PhraseProvenanceComment

/**
 * Get playlists that contain this phrase
 */
export function usePhrasePlaylists(
	phraseId: uuid
): UseLiveQueryResult<PhraseProvenancePlaylistRow[]> {
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
): UseLiveQueryResult<PhraseProvenanceCommentRow[]> {
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

/**
 * Get all provenance items (playlists + comments) sorted by date,
 * each annotated with sibling phrase IDs from the same source.
 */
export function usePhraseProvenance(phraseId: uuid): PhraseProvenanceItem[] {
	const { data: playlists } = usePhrasePlaylists(phraseId)
	const { data: comments } = usePhraseComments(phraseId)

	const playlistIds = (playlists ?? []).map((p) => p.playlistId)
	const requestIds = [...new Set((comments ?? []).map((c) => c.requestId))]

	const { data: playlistSiblings } = useLiveQuery(
		(q) =>
			playlistIds.length === 0
				? undefined
				: q
						.from({ link: playlistPhraseLinksCollection })
						.where(({ link }) => inArray(link.playlist_id, playlistIds))
						.select(({ link }) => ({
							phraseId: link.phrase_id,
							playlistId: link.playlist_id,
						})),
		[playlistIds.join(',')]
	)

	const { data: threadSiblings } = useLiveQuery(
		(q) =>
			requestIds.length === 0
				? undefined
				: q
						.from({ link: commentPhraseLinksCollection })
						.where(({ link }) => inArray(link.request_id, requestIds))
						.select(({ link }) => ({
							phraseId: link.phrase_id,
							requestId: link.request_id,
						})),
		[requestIds.join(',')]
	)

	const playlistSiblingMap = new Map<uuid, uuid[]>()
	for (const s of playlistSiblings ?? []) {
		if (s.phraseId === phraseId) continue
		const list = playlistSiblingMap.get(s.playlistId) ?? []
		if (!list.includes(s.phraseId)) list.push(s.phraseId)
		playlistSiblingMap.set(s.playlistId, list)
	}

	const threadSiblingMap = new Map<uuid, uuid[]>()
	for (const s of threadSiblings ?? []) {
		if (s.phraseId === phraseId) continue
		const list = threadSiblingMap.get(s.requestId) ?? []
		if (!list.includes(s.phraseId)) list.push(s.phraseId)
		threadSiblingMap.set(s.requestId, list)
	}

	const playlistItems: PhraseProvenancePlaylist[] = (playlists ?? []).map((p) =>
		Object.assign({}, p, {
			siblings: playlistSiblingMap.get(p.playlistId) ?? [],
		})
	)
	const commentItems: PhraseProvenanceComment[] = (comments ?? []).map((c) =>
		Object.assign({}, c, {
			siblings: threadSiblingMap.get(c.requestId) ?? [],
		})
	)

	const items: PhraseProvenanceItem[] = [
		...playlistItems,
		...commentItems,
	].toSorted(
		(a, b) =>
			new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
	)
	return items
}
