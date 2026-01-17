import { and, eq, ilike, inArray } from '@tanstack/db'
import { useLiveQuery } from '@tanstack/react-db'

import type { pids, UseLiveQueryResult, uuid } from '@/types/main'
import type {
	LangTagType,
	LanguageType,
	PhraseFullFilteredType,
	PhraseFullFullType,
	PhraseFullType,
} from '@/lib/schemas'
import {
	langTagsCollection,
	languagesCollection,
	playlistPhraseLinksCollection,
	phrasePlaylistsCollection,
	commentPhraseLinksCollection,
	commentsCollection,
	phraseRequestsCollection,
} from '@/lib/collections'
import { phrasesFull } from '@/lib/live-collections'
import { useLanguagesToShow } from '@/hooks/use-profile'
import { splitPhraseTranslations } from '@/hooks/composite-phrase'
import { useUserId } from '@/lib/use-auth'

export const useLanguageMeta = (
	lang: string
): UseLiveQueryResult<LanguageType> =>
	useLiveQuery(
		(q) =>
			q
				.from({ language: languagesCollection })
				.where(({ language }) => eq(language.lang, lang))
				.findOne(),
		[lang]
	)

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
				// console.log(`useLanguagePhrasesSearch: no query`)
				return undefined
			}
			let query = q.from({ phrase: phrasesFull })
			if (lang) {
				// console.log(`useLanguagePhrasesSearch: adding lang filter ${lang}`)
				query = query.where(({ phrase }) => eq(phrase.lang, lang))
			}
			if (queryString) {
				// console.log(`useLanguagePhrasesSearch: text filter ${queryString}`)
				query = query.where(({ phrase }) =>
					ilike(phrase.searchableText, `%${queryString}%`)
				)
			}
			if (filteredPids) {
				// console.log(
				// 	`useLanguagePhrasesSearch: filtered pids: ${filteredPids.length}`
				// )
				query = query.where(({ phrase }) => inArray(phrase.id, filteredPids))
			}
			if (tags?.length) {
				// console.log(`useLanguagePhrasesSearch: tag filter ${tags}`)
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

export const useLanguageTags = (
	lang: string
): UseLiveQueryResult<LangTagType[]> => {
	return useLiveQuery(
		(q) =>
			q
				.from({ langTag: langTagsCollection })
				.where(({ langTag }) => eq(langTag.lang, lang)),

		[lang]
	)
}

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
