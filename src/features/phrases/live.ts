import {
	BasicIndex,
	createLiveQueryCollection,
	eq,
	inArray,
	toArray,
} from '@tanstack/db'
import { useLiveQuery } from '@tanstack/react-db'

import type { UseLiveQueryResult, uuid } from '@/types/main'
import {
	phrasesCollection,
	phraseTagLinksCollection,
	phraseTranslationsCollection,
} from './collections'
import { langTagsCollection } from '@/features/languages/collections'
import { publicProfilesCollection } from '@/features/profile/collections'
import { phrasePlaylistsCollection } from '@/features/playlists/collections'
import {
	phrasePlaylistsActive,
	playlistPhraseLinksActive,
} from '@/features/playlists/live'
import { phraseRequestsCollection } from '@/features/requests/collections'
import {
	commentPhraseLinksActive,
	commentsActive,
	phraseRequestsActive,
} from '@/features/requests/live'

// Phrase row with translations + tags aggregated via toArray(). Used by
// `useOnePhrase` / `useLangPhrasesRaw` and as the base for `phrasesFull`.
// Keeping it as a derived collection means the aggregations run once and
// are reused across consumers.
/**
 * Phrase-to-tag links with `deleted = false` pre-filtered.
 * Use this anywhere you want the tags a phrase actually carries.
 */
export const phraseTagLinksActive = createLiveQueryCollection({
	query: (q) =>
		q
			.from({ link: phraseTagLinksCollection })
			.where(({ link }) => eq(link.deleted, false)),
})

export const phrasesComposed = createLiveQueryCollection({
	id: 'phrases_composed',
	query: (q) =>
		q.from({ phrase: phrasesCollection }).select(({ phrase }) => ({
			...phrase,
			translations: toArray(
				q
					.from({ t: phraseTranslationsCollection })
					.where(({ t }) => eq(t.phrase_id, phrase.id))
					.select(({ t }) => t)
			),
			tags: toArray(
				q
					.from({ link: phraseTagLinksActive })
					.join(
						{ tag: langTagsCollection },
						({ link, tag }) => eq(link.tag_id, tag.id),
						'inner'
					)
					.where(({ link }) => eq(link.phrase_id, phrase.id))
					.select(({ link, tag }) => ({
						id: tag.id,
						name: tag.name,
						linkId: link.id,
						addedBy: link.added_by,
					}))
			),
		})),
})

phrasesComposed.createIndex((row) => row.id, { indexType: BasicIndex })

/**
 * The public composition: `phrasesComposed` with the archived rows dropped,
 * both the phrase itself and any archived translation hanging off it.
 *
 * Every reading surface uses this — browse, search, review, playlists. The
 * two admin screens read `phrasesComposed` instead, because moderating an
 * archived phrase means seeing it. Nothing downstream filters `archived`
 * again; state the filter once (docs/mutations.md).
 */
export const phrasesFull = createLiveQueryCollection({
	id: 'phrases_full',
	query: (q) =>
		q
			.from({ phrase: phrasesComposed })
			.where(({ phrase }) => eq(phrase.archived, false))
			.join(
				{ profile: publicProfilesCollection },
				({ phrase, profile }) => eq(phrase.added_by, profile.uid),
				'inner'
			)
			.fn.select(({ phrase, profile }) => {
				const translations = (phrase.translations ?? []).filter(
					(translation) => !translation.archived
				)
				const tags = phrase.tags ?? []
				return {
					...phrase,
					translations,
					tags,
					profile,
					searchableText: [
						phrase.text,
						...translations.map((t) => t.text),
						...tags.map((t) => t.name),
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
						.from({ link: playlistPhraseLinksActive })
						.join(
							{ playlist: phrasePlaylistsActive },
							({ link, playlist }) => eq(link.playlist_id, playlist.id),
							'inner'
						)
						.where(({ link }) => eq(link.phrase_id, phrase.id))
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
						.from({ link: commentPhraseLinksActive })
						.join(
							{ comment: commentsActive },
							({ link, comment }) => eq(link.comment_id, comment.id),
							'inner'
						)
						.join(
							{ request: phraseRequestsActive },
							({ comment, request }) => eq(comment.request_id, request.id),
							'inner'
						)
						.where(({ link }) => eq(link.phrase_id, phrase.id))
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
						.from({ link: playlistPhraseLinksActive })
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
						.from({ link: commentPhraseLinksActive })
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
