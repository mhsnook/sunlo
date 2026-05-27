import {
	and,
	BasicIndex,
	createLiveQueryCollection,
	eq,
	inArray,
	toArray,
} from '@tanstack/db'
import { useLiveQuery } from '@tanstack/react-db'

import type { UseLiveQueryResult, uuid } from '@/types/main'
import { phrasesCollection, phraseTranslationsCollection } from './collections'
import { publicProfilesCollection } from '@/features/profile/collections'
import {
	playlistPhraseLinksCollection,
	phrasePlaylistsCollection,
} from '@/features/playlists/collections'
import {
	commentPhraseLinksCollection,
	commentsCollection,
	phraseRequestsCollection,
} from '@/features/requests/collections'

// Phrase row with its translations aggregated via toArray(). Used by
// `useOnePhrase` / `useLangPhrasesRaw` and as the base for `phrasesFull`.
// Keeping it as a derived collection means the aggregation runs once and
// is reused across consumers.
export const phrasesWithTranslations = createLiveQueryCollection({
	id: 'phrases_with_translations',
	query: (q) =>
		q.from({ phrase: phrasesCollection }).select(({ phrase }) => ({
			...phrase,
			translations: toArray(
				q
					.from({ t: phraseTranslationsCollection })
					.where(({ t }) => eq(t.phrase_id, phrase.id))
					.select(({ t }) => t)
			),
		})),
})

phrasesWithTranslations.createIndex((row) => row.id, { indexType: BasicIndex })

export const phrasesFull = createLiveQueryCollection({
	id: 'phrases_full',
	query: (q) =>
		q
			.from({ phrase: phrasesWithTranslations })
			.join(
				{ profile: publicProfilesCollection },
				({ phrase, profile }) => eq(phrase.added_by, profile.uid),
				'inner'
			)
			.fn.select(({ phrase, profile }) => {
				const translations = phrase.translations ?? []
				return {
					...phrase,
					translations,
					profile,
					searchableText: [
						phrase.text,
						...translations.map((t) => t.text),
						...(phrase.tags ?? []).map((t) => t.name),
					].join(', '),
				}
			}),
})

phrasesFull.createIndex((row) => row.id, { indexType: BasicIndex })

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
 * Playlists this phrase appears in. Uses the v0.6 nested-`q.from()`
 * pattern: the outer query yields one phrase row whose `playlists` field
 * is itself a child collection. The hook subscribes to that child
 * collection directly and returns the flat array.
 */
export const usePhrasePlaylists = (
	phraseId: uuid
): UseLiveQueryResult<PhraseProvenancePlaylist[]> => {
	const parent = useLiveQuery(
		(q) =>
			q
				.from({ phrase: phrasesCollection })
				.where(({ phrase }) => eq(phrase.id, phraseId))
				.select(({ phrase }) => ({
					id: phrase.id,
					playlists: q
						.from({ link: playlistPhraseLinksCollection })
						.join(
							{ playlist: phrasePlaylistsCollection },
							({ link, playlist }) => eq(link.playlist_id, playlist.id),
							'inner'
						)
						.where(({ link, playlist }) =>
							and(eq(link.phrase_id, phrase.id), eq(playlist.deleted, false))
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
				}))
				.findOne(),
		[phraseId]
	)
	return useLiveQuery(() => parent.data?.playlists, [parent.data?.playlists])
}

/**
 * Comments mentioning this phrase. Same nested-`q.from()` shape — outer
 * phrase row carries a `comments` child collection.
 */
export const usePhraseComments = (
	phraseId: uuid
): UseLiveQueryResult<PhraseProvenanceComment[]> => {
	const parent = useLiveQuery(
		(q) =>
			q
				.from({ phrase: phrasesCollection })
				.where(({ phrase }) => eq(phrase.id, phraseId))
				.select(({ phrase }) => ({
					id: phrase.id,
					comments: q
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
							and(eq(link.phrase_id, phrase.id), eq(request.deleted, false))
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
				}))
				.findOne(),
		[phraseId]
	)
	return useLiveQuery(() => parent.data?.comments, [parent.data?.comments])
}

export interface RelatedCardSource {
	type: 'playlist' | 'thread'
	id: uuid
	label: string
}

export interface RelatedCard {
	phraseId: uuid
	sources: RelatedCardSource[]
}

/**
 * Phrases related to this one via shared playlists or request threads.
 * Returns deduplicated phrase IDs with source metadata. The two sibling
 * lookups are co-located here so `phrases/hooks.ts` doesn't have to
 * import other features' collections.
 */
export function useRelatedCards(phraseId: uuid): RelatedCard[] {
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

	const { data: threadSiblings } = useLiveQuery(
		(q) =>
			requestIds.length === 0
				? undefined
				: q
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
