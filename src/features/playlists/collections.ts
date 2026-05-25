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
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'
import { toastError } from '@/components/ui/sonner'

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
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
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
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
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
		onInsert: async ({ transaction }) => {
			try {
				await Promise.all(
					transaction.mutations.map(async (m) => {
						const { error } = await supabase.rpc('set_phrase_playlist_upvote', {
							p_playlist_id: m.modified.playlist_id,
							p_action: 'add',
						})
						if (error) throw error
					})
				)
				if (phrasePlaylistsCollection.status === 'ready') {
					for (const m of transaction.mutations) {
						const parent = phrasePlaylistsCollection.get(m.modified.playlist_id)
						if (parent) {
							phrasePlaylistsCollection.utils.writeUpdate({
								id: m.modified.playlist_id,
								upvote_count: (parent.upvote_count ?? 0) + 1,
							})
						}
					}
				}
				return { refetch: false }
			} catch (err) {
				toastError('Failed to upvote — please try again')
				throw err
			}
		},
		onDelete: async ({ transaction }) => {
			try {
				await Promise.all(
					transaction.mutations.map(async (m) => {
						const { error } = await supabase.rpc('set_phrase_playlist_upvote', {
							p_playlist_id: m.original.playlist_id,
							p_action: 'remove',
						})
						if (error) throw error
					})
				)
				if (phrasePlaylistsCollection.status === 'ready') {
					for (const m of transaction.mutations) {
						const parent = phrasePlaylistsCollection.get(m.original.playlist_id)
						if (parent) {
							phrasePlaylistsCollection.utils.writeUpdate({
								id: m.original.playlist_id,
								upvote_count: Math.max(0, (parent.upvote_count ?? 0) - 1),
							})
						}
					}
				}
				return { refetch: false }
			} catch (err) {
				toastError('Failed to remove vote — please try again')
				throw err
			}
		},
	})
)
