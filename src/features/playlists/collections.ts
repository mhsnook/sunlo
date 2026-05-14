import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { BasicIndex } from '@tanstack/db'
import {
	PhrasePlaylistSchema,
	type PhrasePlaylistType,
	PlaylistPhraseLinkSchema,
	type PlaylistPhraseLinkType,
	PhrasePlaylistUpvoteSchema,
	type PhrasePlaylistUpvoteType,
} from './schemas'
import {
	phrasePlaylistsQuery,
	playlistPhraseLinksQuery,
	phrasePlaylistUpvotesQuery,
} from './queries'
import { queryClient } from '@/lib/query-client'

export {
	phrasePlaylistsQuery,
	playlistPhraseLinksQuery,
	phrasePlaylistUpvotesQuery,
}

export const phrasePlaylistsCollection = createCollection(
	queryCollectionOptions({
		id: 'phrase_playlist',
		queryKey: phrasePlaylistsQuery.queryKey,
		queryFn: phrasePlaylistsQuery.queryFn!,
		getKey: (item: PhrasePlaylistType) => item.id,
		queryClient,
		schema: PhrasePlaylistSchema,
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
	})
)

export const playlistPhraseLinksCollection = createCollection(
	queryCollectionOptions({
		id: 'playlist_phrase_links',
		queryKey: playlistPhraseLinksQuery.queryKey,
		queryFn: playlistPhraseLinksQuery.queryFn!,
		getKey: (item: PlaylistPhraseLinkType) => item.id,
		queryClient,
		schema: PlaylistPhraseLinkSchema,
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
	})
)

export const phrasePlaylistUpvotesCollection = createCollection(
	queryCollectionOptions({
		id: 'phrase_playlist_upvotes',
		queryKey: phrasePlaylistUpvotesQuery.queryKey,
		queryFn: phrasePlaylistUpvotesQuery.queryFn!,
		getKey: (item: PhrasePlaylistUpvoteType) => item.playlist_id,
		queryClient,
		schema: PhrasePlaylistUpvoteSchema,
	})
)
