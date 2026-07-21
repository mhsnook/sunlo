import { eq, useLiveQuery } from '@tanstack/react-db'
import type { UseLiveQueryResult, uuid } from '@/types/main'
import type { PhraseFullFullType } from '@/features/phrases/schemas'
import type { PhrasePlaylistType, PlaylistPhraseLinkType } from './schemas'

import {
	phrasePlaylistsCollection,
	phrasePlaylistUpvotesCollection,
	playlistPhraseLinksCollection,
} from './collections'
import { phrasesFull } from '@/features/phrases/live'
import { useUserId } from '@/lib/use-auth'

export function useAnyonesPlaylists(
	uid: uuid,
	lang?: string
): UseLiveQueryResult<PhrasePlaylistType[]> {
	return useLiveQuery(
		(q) => {
			let query = q
				.from({ list: phrasePlaylistsCollection })
				.where(({ list }) => eq(list.uid, uid))
			if (lang) query = query.where(({ list }) => eq(list.lang, lang))
			return (
				query
					// .groupBy(({ list }) => [list.id]) // I want to add count() of the phrase links
					.orderBy(({ list }) => list.created_at, 'desc')
			)
		},
		[uid]
	)
}

export function useLangPlaylists(
	lang: string
): UseLiveQueryResult<PhrasePlaylistType[]> {
	return useLiveQuery(
		(q) =>
			q
				.from({ list: phrasePlaylistsCollection })
				.where(({ list }) => eq(list.lang, lang))
				.orderBy(({ list }) => list.created_at, 'desc'),
		[lang]
	)
}

export function useMyPlaylists(): UseLiveQueryResult<PhrasePlaylistType[]> {
	const userId = useUserId()
	return useAnyonesPlaylists(userId!)
}

// Internal getter: look up a playlist by its uuid. Used by feed items,
// previews, and the share button — all holding a uuid from synced data.
export function useOnePlaylist(
	id: string | undefined | null
): UseLiveQueryResult<PhrasePlaylistType> {
	return useLiveQuery(
		(q) =>
			!id
				? undefined
				: q
						.from({ list: phrasePlaylistsCollection })
						.where(({ list }) => eq(list.id, id))
						.findOne(),
		[id]
	)
}

// Route-boundary resolver: look up a playlist by its public_id (URL handle).
export function useOnePlaylistByHandle(
	publicId: string | undefined | null
): UseLiveQueryResult<PhrasePlaylistType> {
	return useLiveQuery(
		(q) =>
			!publicId
				? undefined
				: q
						.from({ list: phrasePlaylistsCollection })
						.where(({ list }) => eq(list.public_id, publicId))
						.findOne(),
		[publicId]
	)
}

export function useOnePlaylistPhrases(
	id: uuid
): UseLiveQueryResult<
	{ link: PlaylistPhraseLinkType; phrase: PhraseFullFullType }[]
> {
	return useLiveQuery(
		(q) =>
			q
				.from({ link: playlistPhraseLinksCollection })
				.join(
					{ phrase: phrasesFull },
					({ link, phrase }) => eq(link.phrase_id, phrase.id),
					'inner'
				)
				.where(({ link }) => eq(link.playlist_id, id))
				.orderBy(({ link }) => link.order),
		[id]
	)
}

/** Whether the current user has upvoted this playlist. */
export const useHasPlaylistUpvote = (playlistId: uuid): boolean =>
	!!useLiveQuery(
		(q) =>
			q
				.from({ upvote: phrasePlaylistUpvotesCollection })
				.where(({ upvote }) => eq(upvote.playlist_id, playlistId)),
		[playlistId]
	).data?.length
