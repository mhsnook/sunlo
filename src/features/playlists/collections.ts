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
import { groupUpdatesByChanges } from '@/lib/collections/group-updates'
import {
	allRowsMatch,
	rowMatches,
	writeSyncedRow,
	writeSyncedRows,
} from '@/lib/collections/synced-row'
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
				transaction.mutations.map(async (m) => {
					const changes = m.changes as TablesUpdate<'phrase_playlist'>
					const { data } = await supabase
						.from('phrase_playlist')
						.update(changes)
						.eq('id', m.original.id)
						.select()
						.throwOnError()
					const row = data?.[0]
					should(
						`phrase_playlist ${m.original.id} server row matches the submitted update`,
						rowMatches(changes, row),
						{ submitted: changes, returned: row }
					)
					if (row)
						writeSyncedRow(
							phrasePlaylistsCollection,
							PhrasePlaylistSchema.parse(row)
						)
				})
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
				.eq('deleted', false)
				.throwOnError()

			return data
		},
		getKey: (item: PlaylistPhraseLinkType) => item.id,
		queryClient,
		schema: PlaylistPhraseLinkSchema,
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
		onInsert: async ({ transaction }) => {
			const submitted = transaction.mutations.map((m) => ({
				id: m.modified.id,
				playlist_id: m.modified.playlist_id,
				phrase_id: m.modified.phrase_id,
				order: m.modified.order,
				href: m.modified.href,
			}))
			const { data } = await supabase
				.from('playlist_phrase_link')
				.insert(submitted)
				.select()
				.throwOnError()
			const returned =
				data?.map((row) => PlaylistPhraseLinkSchema.parse(row)) ?? []
			should(
				'playlist_phrase_link insert returned one row per link added',
				allRowsMatch(submitted, returned),
				{ submitted, returned }
			)
			writeSyncedRows(playlistPhraseLinksCollection, returned)
			return { refetch: false }
		},
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const changes = m.changes as TablesUpdate<'playlist_phrase_link'>
					const { data } = await supabase
						.from('playlist_phrase_link')
						.update(changes)
						.eq('id', m.original.id)
						.select()
						.throwOnError()
					const row = data?.[0]
					should(
						`playlist_phrase_link ${m.original.id} server row matches the submitted update`,
						rowMatches(changes, row),
						{ submitted: changes, returned: row }
					)
					if (row)
						writeSyncedRow(
							playlistPhraseLinksCollection,
							PlaylistPhraseLinkSchema.parse(row)
						)
				})
			)
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
				.select('playlist_id, deleted')
				.throwOnError()
			return data?.map((item) => PhrasePlaylistUpvoteSchema.parse(item)) ?? []
		},
		getKey: (item: PhrasePlaylistUpvoteType) => item.playlist_id,
		queryClient,
		schema: PhrasePlaylistUpvoteSchema,
		// One-per-user enforced by the (playlist_id, uid) PK; upvote_count kept by a
		// DB trigger. Un-upvoting flips `deleted`, so the row stays in the
		// collection and live queries filter it. `guard_upvote_update` rejects
		// an update touching any other column.
		onInsert: async ({ transaction }) => {
			// Upsert, not insert: a row this client has not loaded may already
			// exist with `deleted` set, and an insert would hit the (playlist_id, uid)
			// primary key. `uid` is in the payload so the conflict target is
			// explicit.
			const uid = (await supabase.auth.getSession()).data.session?.user.id
			const ids = transaction.mutations.map((m) => m.modified.playlist_id)
			const { data } = await supabase
				.from('phrase_playlist_upvote')
				.upsert(
					ids.map((playlist_id) => ({ playlist_id, uid, deleted: false })),
					{ onConflict: 'playlist_id,uid' }
				)
				.select('playlist_id, deleted')
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
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				groupUpdatesByChanges(transaction.mutations).map(
					async ({ changes, keys }) => {
						const { data } = await supabase
							.from('phrase_playlist_upvote')
							.update(changes)
							.in('playlist_id', keys)
							.select('playlist_id, deleted')
							.throwOnError()
						const rows =
							data?.map((row) => PhrasePlaylistUpvoteSchema.parse(row)) ?? []
						should(
							'phrase_playlist_upvote update returned one row per upvote changed',
							rows.length === keys.length &&
								keys.every((key) =>
									rows.some((row) => row.playlist_id === key)
								),
							{ submitted: { changes, keys }, returned: rows }
						)
						writeSyncedRows(phrasePlaylistUpvotesCollection, rows)
					}
				)
			)
			return { refetch: false }
		},
	})
)
