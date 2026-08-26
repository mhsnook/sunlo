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
import { deleteSyncedRows, writeSyncedRows } from '@/lib/collections/synced-row'
import type { TablesUpdate } from '@/types/supabase'
import { should } from '@scenetest/checks/react'

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

			return data?.map((p) => PhrasePlaylistSchema.parse(p)) ?? []
		},
		getKey: (item: PhrasePlaylistType) => item.id,
		queryClient,
		schema: PhrasePlaylistSchema,
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
		// Delete is a soft delete (deleted: true) driven through onUpdate; the
		// `deleted = false` filter in live queries hides the row. Call sites own
		// the toast UX via tx.isPersisted.promise.
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map((m) =>
					supabase
						.from('phrase_playlist')
						.update(m.changes as TablesUpdate<'phrase_playlist'>)
						.eq('id', m.original.id)
						.select()
						.throwOnError()
				)
			)
			return { refetch: false }
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
		// uid + created_at default server-side (auth.uid() / now()); the optimistic
		// row already carries client values for them, so { refetch: false }.
		onInsert: async ({ transaction }) => {
			await supabase
				.from('playlist_phrase_link')
				.insert(
					transaction.mutations.map((m) => ({
						id: m.modified.id,
						playlist_id: m.modified.playlist_id,
						phrase_id: m.modified.phrase_id,
						order: m.modified.order,
						href: m.modified.href,
					}))
				)
				.throwOnError()
			return { refetch: false }
		},
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map((m) =>
					supabase
						.from('playlist_phrase_link')
						.update(m.changes as TablesUpdate<'playlist_phrase_link'>)
						.eq('id', m.original.id)
						.throwOnError()
				)
			)
			return { refetch: false }
		},
		onDelete: async ({ transaction }) => {
			await supabase
				.from('playlist_phrase_link')
				.delete()
				.in(
					'id',
					transaction.mutations.map((m) => m.original.id)
				)
				.throwOnError()
			return { refetch: false }
		},
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
				.eq('deleted', false)
				.throwOnError()
			return data?.map((item) => PhrasePlaylistUpvoteSchema.parse(item)) ?? []
		},
		getKey: (item: PhrasePlaylistUpvoteType) => item.playlist_id,
		queryClient,
		schema: PhrasePlaylistUpvoteSchema,
		// One-per-user enforced by the (playlist_id, uid) PK; upvote_count kept by
		// a DB trigger. The collection holds live upvotes only: a row the user
		// un-upvoted stays in the table with `deleted` set, and never loads.
		onInsert: async ({ transaction }) => {
			// Upsert, not insert: un-upvoting leaves the row in place with
			// `deleted` set, so upvoting again revives that row rather than
			// hitting the (playlist_id, uid) primary key. `uid` is in the payload
			// so the conflict target is explicit.
			const uid = (await supabase.auth.getSession()).data.session?.user.id
			const ids = transaction.mutations.map((m) => m.modified.playlist_id)
			const { data } = await supabase
				.from('phrase_playlist_upvote')
				.upsert(
					ids.map((playlist_id) => ({ playlist_id, uid, deleted: false })),
					{ onConflict: 'playlist_id,uid' }
				)
				.select('playlist_id')
				.throwOnError()
			const rows =
				data?.map((row) => PhrasePlaylistUpvoteSchema.parse(row)) ?? []
			should(
				'phrase_playlist_upvote upsert returned one row per upvote added',
				rows.length === ids.length &&
					ids.every((id) => rows.some((row) => row.playlist_id === id)),
				{ submitted: ids, returned: rows }
			)
			writeSyncedRows(phrasePlaylistUpvotesCollection, rows)
			return { refetch: false }
		},
		onDelete: async ({ transaction }) => {
			// Soft delete. A real DELETE broadcasts to every subscriber of the
			// table without an RLS check, so other users' clients would drop
			// their own upvote row — see docs/mutations.md and issue #768.
			const ids = transaction.mutations.map((m) => m.original.playlist_id)
			const { data } = await supabase
				.from('phrase_playlist_upvote')
				.update({ deleted: true })
				.in('playlist_id', ids)
				.select('playlist_id')
				.throwOnError()
			const rows =
				data?.map((row) => PhrasePlaylistUpvoteSchema.parse(row)) ?? []
			should(
				'phrase_playlist_upvote soft delete flagged one row per upvote removed',
				rows.length === ids.length &&
					ids.every((id) => rows.some((row) => row.playlist_id === id)),
				{ submitted: ids, returned: rows }
			)
			deleteSyncedRows(
				phrasePlaylistUpvotesCollection,
				rows.map((row) => row.playlist_id)
			)
			return { refetch: false }
		},
	})
)
