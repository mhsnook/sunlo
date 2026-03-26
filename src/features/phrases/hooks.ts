import { and, eq, ilike, inArray } from '@tanstack/db'
import { useLiveQuery } from '@tanstack/react-db'

import type { pids, UseLiveQueryResult, uuid } from '@/types/main'
import { escapeIlikeInput } from '@/lib/utils'
import type {
	PhraseFullFilteredType,
	PhraseFullFullType,
	PhraseFullType,
} from './schemas'
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
					ilike(phrase.searchableText, `%${escapeIlikeInput(queryString)}%`)
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
