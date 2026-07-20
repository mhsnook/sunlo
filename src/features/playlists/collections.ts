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
import type { TablesUpdate } from '@/types/supabase'

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
		onUpdate: async ({ transaction }) => {
			// { refetch: false } keeps the optimistic value; the edited columns are
			// exactly what we send, so the local row already matches the server.
			try {
				await Promise.all(
					transaction.mutations.map((m) =>
						supabase
							.from('phrase_playlist')
							.update(m.changes as TablesUpdate<'phrase_playlist'>)
							.eq('id', m.original.id)
							.throwOnError()
					)
				)
				return { refetch: false }
			} catch (err) {
				toastError('Failed to update playlist — please try again')
				throw err
			}
		},
		onDelete: async ({ transaction }) => {
			// soft delete
			try {
				await supabase
					.from('phrase_playlist')
					.update({ deleted: true })
					.in(
						'id',
						transaction.mutations.map((m) => m.original.id)
					)
					.throwOnError()
				return { refetch: false }
			} catch (err) {
				toastError('Failed to delete playlist — please try again')
				throw err
			}
		},
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
			if (!(await supabase.auth.getSession()).data?.session) return []
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
		// One-per-user enforced by the (playlist_id, uid) PK; upvote_count kept by
		// a DB trigger. uid defaults to auth.uid().
		onInsert: async ({ transaction }) => {
			await supabase
				.from('phrase_playlist_upvote')
				.insert(
					transaction.mutations.map((m) => ({
						playlist_id: m.modified.playlist_id,
					}))
				)
				.throwOnError()
			return { refetch: false }
		},
		onDelete: async ({ transaction }) => {
			await supabase
				.from('phrase_playlist_upvote')
				.delete()
				.in(
					'playlist_id',
					transaction.mutations.map((m) => m.original.playlist_id)
				)
				.throwOnError()
			return { refetch: false }
		},
	})
)
