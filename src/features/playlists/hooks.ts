import { eq, useLiveQuery } from '@tanstack/react-db'
import { useEffect } from 'react'
import type { UseLiveQueryResult, uuid } from '@/types/main'
import type { PhraseFullFullType } from '@/features/phrases/schemas'
import {
	PhrasePlaylistSchema,
	PlaylistPhraseLinkSchema,
	type PhrasePlaylistType,
	type PhrasePlaylistUpvoteType,
	type PlaylistPhraseLinkType,
} from './schemas'

import {
	phrasePlaylistsCollection,
	phrasePlaylistUpvotesCollection,
	playlistPhraseLinksCollection,
} from './collections'
import { playlistPhraseLinksActive } from './live'
import { phrasesFull } from '@/features/phrases/live'
import supabase from '@/lib/supabase-client'
import { bindRows } from '@/lib/collections/realtime'
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
				.from({ link: playlistPhraseLinksActive })
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

/** This user's upvote row for a playlist — see `useMyRequestUpvote`. */
export const useMyPlaylistUpvote = (
	playlistId: uuid
): PhrasePlaylistUpvoteType | undefined =>
	useLiveQuery(
		(q) =>
			q
				.from({ upvote: phrasePlaylistUpvotesCollection })
				.where(({ upvote }) => eq(upvote.playlist_id, playlistId)),
		[playlistId]
	).data?.[0]

/**
 * Live updates for one playlist, mounted by the playlist detail route: the
 * playlist row (title, description, upvote_count, soft delete) plus its
 * phrase links. One channel per playlist, torn down on navigate — the
 * "thread tables" posture in docs/mutations.md. A removed link reaches
 * only its owner, because the link's SELECT policy hides deleted rows
 * from everyone else.
 */
export const usePlaylistRealtime = (playlistId: uuid) => {
	useEffect(() => {
		let channel = supabase.channel(`playlist-thread-${playlistId}`)
		channel = bindRows(
			channel,
			'phrase_playlist',
			`id=eq.${playlistId}`,
			phrasePlaylistsCollection,
			(row) => PhrasePlaylistSchema.parse(row)
		)
		channel = bindRows(
			channel,
			'playlist_phrase_link',
			`playlist_id=eq.${playlistId}`,
			playlistPhraseLinksCollection,
			(row) => PlaylistPhraseLinkSchema.parse(row)
		)
		channel.subscribe()

		return () => {
			void supabase.removeChannel(channel)
		}
	}, [playlistId])
}
