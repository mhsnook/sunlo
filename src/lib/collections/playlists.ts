import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import {
	PhrasePlaylistSchema,
	type PhrasePlaylistType,
	PlaylistPhraseLinkSchema,
	type PlaylistPhraseLinkType,
	PhrasePlaylistUpvoteSchema,
	type PhrasePlaylistUpvoteType,
} from '@/lib/schemas/playlists'
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'

export const phrasePlaylistsCollection = createCollection(
	queryCollectionOptions({
		id: 'phrase_playlist',
		queryKey: ['public', 'playlist'],
		queryFn: async () => {
			console.log(`Loading phrasePlaylistsCollection`)
			const { data } = await supabase
				.from('phrase_playlist')
				.select()
				.throwOnError()

			return data
		},
		getKey: (item: PhrasePlaylistType) => item.id,
		queryClient,
		schema: PhrasePlaylistSchema,
	})
)

export const playlistPhraseLinksCollection = createCollection(
	queryCollectionOptions({
		id: 'playlist_phrase_links',
		queryKey: ['public', 'playlist_phrase_link'],
		queryFn: async () => {
			console.log(`Loading playlistPhraseLinksCollection`)
			const { data } = await supabase
				.from('playlist_phrase_link')
				.select()
				.throwOnError()

			return data
		},
		getKey: (item: PlaylistPhraseLinkType) => item.id,
		queryClient,
		schema: PlaylistPhraseLinkSchema,
	})
)

export const phrasePlaylistUpvotesCollection = createCollection(
	queryCollectionOptions({
		id: 'phrase_playlist_upvotes',
		queryKey: ['user', 'phrase_playlist_upvote'],
		queryFn: async () => {
			console.log(`Loading phrasePlaylistUpvotesCollection`)
			const { data } = await supabase
				.from('phrase_playlist_upvote')
				.select('playlist_id')
				.throwOnError()
			return data?.map((item) => PhrasePlaylistUpvoteSchema.parse(item)) ?? []
		},
		getKey: (item: PhrasePlaylistUpvoteType) => item.playlist_id,
		queryClient,
		schema: PhrasePlaylistUpvoteSchema,
	})
)
