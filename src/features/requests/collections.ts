import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { BasicIndex } from '@tanstack/db'
import {
	PhraseRequestSchema,
	type PhraseRequestType,
	PhraseRequestUpvoteSchema,
	type PhraseRequestUpvoteType,
	RequestCommentSchema,
	type RequestCommentType,
	CommentPhraseLinkSchema,
	type CommentPhraseLinkType,
	CommentUpvoteSchema,
	type CommentUpvoteType,
	MessageSchema,
	type MessageType,
	MessageTagSchema,
	type MessageTagType,
	MessageTagLinkSchema,
	type MessageTagLinkType,
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
import { should } from '@scenetest/checks/react'

export const phraseRequestsCollection = createCollection(
	queryCollectionOptions({
		id: 'phrase_requests',
		queryKey: ['public', 'phrase_request'],
		queryFn: async () => {
			console.log(`Loading phraseRequestscollection`)

			const { data } = await supabase
				.from('phrase_request')
				.select()
				.throwOnError()
			return data?.map((p) => PhraseRequestSchema.parse(p)) ?? []
		},
		getKey: (item: PhraseRequestType) => item.id,
		schema: PhraseRequestSchema,
		queryClient,
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const { data } = await supabase
						.from('phrase_request')
						.update(m.changes)
						.eq('id', m.original.id)
						.select()
						.throwOnError()
					// m.changes IS the optimistic collection value, so confirming the
					// server's returned row matches it proves client/server agreement.
					const row = data?.[0]
					should(
						`phrase_request ${m.original.id} server row matches the submitted update`,
						rowMatches(m.changes, row),
						{ submitted: m.changes, returned: row }
					)
					if (row)
						writeSyncedRow(
							phraseRequestsCollection,
							PhraseRequestSchema.parse(row)
						)
				})
			)
			return { refetch: false }
		},
	})
)

export const phraseRequestUpvotesCollection = createCollection(
	queryCollectionOptions({
		id: 'phrase_request_upvotes',
		queryKey: ['user', 'phrase_request_upvote'],
		queryFn: async () => {
			if (!(await supabase.auth.getSession()).data?.session) return []
			console.log(`Loading phraseRequestUpvotesCollection`)
			const { data } = await supabase
				.from('phrase_request_upvote')
				.select('request_id, deleted')
				.throwOnError()
			return data?.map((item) => PhraseRequestUpvoteSchema.parse(item)) ?? []
		},
		getKey: (item: PhraseRequestUpvoteType) => item.request_id,
		queryClient,
		schema: PhraseRequestUpvoteSchema,
		// One-per-user enforced by the (request_id, uid) PK; upvote_count kept by a
		// DB trigger. Un-upvoting flips `deleted`, so the row stays in the
		// collection and live queries filter it. `guard_upvote_update` rejects
		// an update touching any other column.
		onInsert: async ({ transaction }) => {
			// Upsert, not insert: a row this client has not loaded may already
			// exist with `deleted` set, and the insert would hit the (request_id,
			// uid) primary key. `uid` is in the payload so the conflict target
			// is explicit.
			const uid = (await supabase.auth.getSession()).data.session?.user.id
			const ids = transaction.mutations.map((m) => m.modified.request_id)
			const { data } = await supabase
				.from('phrase_request_upvote')
				.upsert(
					ids.map((request_id) => ({ request_id, uid, deleted: false })),
					{ onConflict: 'request_id,uid' }
				)
				.select('request_id, deleted')
				.throwOnError()
			const rows =
				data?.map((row) => PhraseRequestUpvoteSchema.parse(row)) ?? []
			should(
				'phrase_request_upvote upsert returned one row per upvote added',
				rows.length === ids.length &&
					ids.every((id) => rows.some((row) => row.request_id === id)),
				{ submitted: ids, returned: rows }
			)
			writeSyncedRows(phraseRequestUpvotesCollection, rows)
			return { refetch: false }
		},
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				groupUpdatesByChanges(transaction.mutations).map(
					async ({ changes, keys }) => {
						const { data } = await supabase
							.from('phrase_request_upvote')
							.update(changes)
							.in('request_id', keys)
							.select('request_id, deleted')
							.throwOnError()
						const rows =
							data?.map((row) => PhraseRequestUpvoteSchema.parse(row)) ?? []
						should(
							'phrase_request_upvote update returned one row per upvote changed',
							rows.length === keys.length &&
								keys.every((key) => rows.some((row) => row.request_id === key)),
							{ submitted: { changes, keys }, returned: rows }
						)
						writeSyncedRows(phraseRequestUpvotesCollection, rows)
					}
				)
			)
			return { refetch: false }
		},
	})
)

export const commentsCollection = createCollection(
	queryCollectionOptions({
		id: 'request_comments',
		queryKey: ['public', 'request_comment'],
		queryFn: async () => {
			console.log(`Loading commentsCollection`)
			const { data } = await supabase
				.from('request_comment')
				.select()
				.throwOnError()
			return data?.map((item) => RequestCommentSchema.parse(item)) ?? []
		},
		getKey: (item: RequestCommentType) => item.id,
		queryClient,
		schema: RequestCommentSchema,
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const { data } = await supabase
						.from('request_comment')
						.update(m.changes)
						.eq('id', m.original.id)
						.select()
						.throwOnError()
					const row = data?.[0]
					should(
						`request_comment ${m.original.id} server row matches the submitted update`,
						rowMatches(m.changes, row),
						{ submitted: m.changes, returned: row }
					)
					if (row)
						writeSyncedRow(commentsCollection, RequestCommentSchema.parse(row))
				})
			)
			return { refetch: false }
		},
		onDelete: async ({ transaction }) => {
			const ids = transaction.mutations.map((m) => m.original.id)
			const { data } = await supabase
				.from('request_comment')
				.delete()
				.in('id', ids)
				.select()
				.throwOnError()
			// A delete with .select() returns the rows it removed; confirm we
			// removed exactly the targeted comments. Stripped from production
			// by the Vite plugin.
			const returned = data ?? []
			should(
				'request_comment delete removed one row per targeted comment',
				returned.length === ids.length &&
					ids.every((id) => returned.some((row) => row.id === id)),
				{ submitted: ids, returned }
			)
			// Cascade-deleted replies and phrase links linger in the local
			// collections until the next stale refetch, but they don't render
			// (orphaned replies have no parent anchor; orphaned phrase links
			// filter out of the provenance inner-join). Skipping the full-table
			// refetch is worth that small inconsistency.
			return { refetch: false }
		},
	})
)

export const commentPhraseLinksCollection = createCollection(
	queryCollectionOptions({
		id: 'comment_phrase_links',
		queryKey: ['public', 'comment_phrase_link'],
		queryFn: async () => {
			console.log(`Loading commentPhraseLinksCollection`)
			const { data } = await supabase
				.from('comment_phrase_link')
				.select()
				.throwOnError()
			return data?.map((item) => CommentPhraseLinkSchema.parse(item)) ?? []
		},
		getKey: (item: CommentPhraseLinkType) => item.id,
		queryClient,
		schema: CommentPhraseLinkSchema,
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
	})
)

export const commentUpvotesCollection = createCollection(
	queryCollectionOptions({
		id: 'comment_upvotes',
		queryKey: ['user', 'comment_upvote'],
		queryFn: async () => {
			if (!(await supabase.auth.getSession()).data?.session) return []
			console.log(`Loading commentUpvotesCollection`)
			const { data } = await supabase
				.from('comment_upvote')
				.select('comment_id, deleted')
				.throwOnError()
			return data?.map((item) => CommentUpvoteSchema.parse(item)) ?? []
		},
		getKey: (item: CommentUpvoteType) => item.comment_id,
		queryClient,
		schema: CommentUpvoteSchema,
		// One-per-user enforced by the (comment_id, uid) PK; upvote_count kept by a
		// DB trigger. Un-upvoting flips `deleted`, so the row stays in the
		// collection and live queries filter it. `guard_upvote_update` rejects
		// an update touching any other column.
		onInsert: async ({ transaction }) => {
			// Upsert, not insert: a row this client has not loaded may already
			// exist with `deleted` set, and an insert would hit the (comment_id, uid)
			// primary key. `uid` is in the payload so the conflict target is
			// explicit.
			const uid = (await supabase.auth.getSession()).data.session?.user.id
			const ids = transaction.mutations.map((m) => m.modified.comment_id)
			const { data } = await supabase
				.from('comment_upvote')
				.upsert(
					ids.map((comment_id) => ({ comment_id, uid, deleted: false })),
					{ onConflict: 'comment_id,uid' }
				)
				.select('comment_id, deleted')
				.throwOnError()
			const rows = data?.map((row) => CommentUpvoteSchema.parse(row)) ?? []
			should(
				'comment_upvote upsert returned one row per upvote added',
				rows.length === ids.length &&
					ids.every((id) => rows.some((row) => row.comment_id === id)),
				{ submitted: ids, returned: rows }
			)
			writeSyncedRows(commentUpvotesCollection, rows)
			return { refetch: false }
		},
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				groupUpdatesByChanges(transaction.mutations).map(
					async ({ changes, keys }) => {
						const { data } = await supabase
							.from('comment_upvote')
							.update(changes)
							.in('comment_id', keys)
							.select('comment_id, deleted')
							.throwOnError()
						const rows =
							data?.map((row) => CommentUpvoteSchema.parse(row)) ?? []
						should(
							'comment_upvote update returned one row per upvote changed',
							rows.length === keys.length &&
								keys.every((key) => rows.some((row) => row.comment_id === key)),
							{ submitted: { changes, keys }, returned: rows }
						)
						writeSyncedRows(commentUpvotesCollection, rows)
					}
				)
			)
			return { refetch: false }
		},
	})
)

export const messagesCollection = createCollection(
	queryCollectionOptions({
		id: 'messages',
		queryKey: ['public', 'message'],
		queryFn: async () => {
			console.log(`Loading messagesCollection`)
			const { data } = await supabase.from('message').select().throwOnError()
			return data?.map((item) => MessageSchema.parse(item)) ?? []
		},
		getKey: (item: MessageType) => item.id,
		queryClient,
		schema: MessageSchema,
	})
)

export const messageTagsCollection = createCollection(
	queryCollectionOptions({
		id: 'message_tags',
		queryKey: ['public', 'message_tag'],
		queryFn: async () => {
			console.log(`Loading messageTagsCollection`)
			const { data } = await supabase
				.from('message_tag')
				.select()
				.order('sort_order', { ascending: true })
				.throwOnError()
			return data?.map((item) => MessageTagSchema.parse(item)) ?? []
		},
		getKey: (item: MessageTagType) => item.slug,
		queryClient,
		schema: MessageTagSchema,
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
		onInsert: async ({ transaction }) => {
			const submitted = transaction.mutations.map((m) => ({
				slug: m.modified.slug,
				label: m.modified.label,
				description: m.modified.description,
				sort_order: m.modified.sort_order,
			}))
			const { data } = await supabase
				.from('message_tag')
				.insert(submitted)
				.select()
				.throwOnError()
			const returned = data?.map((row) => MessageTagSchema.parse(row)) ?? []
			should(
				'message_tag insert returned one row per tag added',
				allRowsMatch(submitted, returned),
				{ submitted, returned }
			)
			writeSyncedRows(messageTagsCollection, returned)
			return { refetch: false }
		},
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					// .select() so we can confirm rows were actually affected:
					// RLS-protected UPDATE silently returns 0 rows when the
					// caller lacks permission (no PostgREST error). Throwing
					// rolls the optimistic state back and surfaces the failure.
					const { data } = await supabase
						.from('message_tag')
						.update(m.changes)
						.eq('slug', m.original.slug)
						.select()
						.throwOnError()
					if (!data || data.length === 0) {
						throw new Error(
							`Update on message_tag "${m.original.slug}" affected no rows (permission denied or row removed).`
						)
					}
					writeSyncedRow(messageTagsCollection, MessageTagSchema.parse(data[0]))
				})
			)
			return { refetch: false }
		},
		onDelete: async ({ transaction }) => {
			// .select() so we can count the rows actually removed: an RLS-blocked
			// DELETE returns 0 rows with no PostgREST error. Throwing rolls the
			// optimistic state back and surfaces the failure.
			const slugs = transaction.mutations.map((m) => m.original.slug)
			const { data } = await supabase
				.from('message_tag')
				.delete()
				.in('slug', slugs)
				.select()
				.throwOnError()
			if ((data?.length ?? 0) !== slugs.length) {
				throw new Error(
					`Delete on message_tag affected ${data?.length ?? 0} of ${slugs.length} rows (permission denied or row removed).`
				)
			}
			return { refetch: false }
		},
	})
)

export const messageTagLinksCollection = createCollection(
	queryCollectionOptions({
		id: 'message_tag_links',
		queryKey: ['public', 'message_tag_link'],
		queryFn: async () => {
			console.log(`Loading messageTagLinksCollection`)
			const { data } = await supabase
				.from('message_tag_link')
				.select()
				.throwOnError()
			return data?.map((item) => MessageTagLinkSchema.parse(item)) ?? []
		},
		// composite PK; getKey just needs to be stable+unique per row
		getKey: (item: MessageTagLinkType) =>
			`${item.message_id}--${item.tag_slug}`,
		queryClient,
		schema: MessageTagLinkSchema,
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
		onInsert: async ({ transaction }) => {
			const submitted = transaction.mutations.map((m) => ({
				message_id: m.modified.message_id,
				tag_slug: m.modified.tag_slug,
			}))
			const { data } = await supabase
				.from('message_tag_link')
				.insert(submitted)
				.select()
				.throwOnError()
			const returned = data?.map((row) => MessageTagLinkSchema.parse(row)) ?? []
			should(
				'message_tag_link insert returned one row per link added',
				allRowsMatch(submitted, returned),
				{ submitted, returned }
			)
			writeSyncedRows(messageTagLinksCollection, returned)
			return { refetch: false }
		},
		onDelete: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const { data } = await supabase
						.from('message_tag_link')
						.delete()
						.eq('message_id', m.original.message_id)
						.eq('tag_slug', m.original.tag_slug)
						.select()
						.throwOnError()
					if (!data || data.length === 0) {
						throw new Error(
							`Delete on message_tag_link (${m.original.message_id}, ${m.original.tag_slug}) affected no rows (permission denied or row already removed).`
						)
					}
				})
			)
			return { refetch: false }
		},
	})
)
