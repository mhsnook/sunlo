import { eq, useLiveQuery } from '@tanstack/react-db'
import type { UseLiveQueryResult, uuid } from '@/types/main'
import type { PhraseFullFullType } from '@/lib/schemas'
import type {
	PhrasePlaylistType,
	PlaylistPhraseLinkType,
} from '@/lib/schemas-playlist'

import {
	phrasePlaylistsCollection,
	playlistPhraseLinksCollection,
} from '@/lib/collections'
import { phrasesFull } from '@/lib/live-collections'
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

export function useOnePlaylist(
	id: uuid
): UseLiveQueryResult<PhrasePlaylistType> {
	return useLiveQuery(
		(q) =>
			q
				.from({ list: phrasePlaylistsCollection })
				.where(({ list }) => eq(list.id, id))
				.findOne(),
		[id]
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
