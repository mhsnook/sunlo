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
} from './schemas'
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'
import { toastError } from '@/components/ui/sonner'
import { should } from '@scenetest/checks-react'

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
					// m.changes IS the optimistic collection value; confirming the
					// server's returned row matches it proves client/server
					// agreement. A soft-delete (deleted: true) may not be
					// selectable back under RLS — `!row ||` skips the assertion
					// rather than failing. The guard lives inside should() so the
					// whole call strips cleanly from production builds.
					const row = data?.[0] as Record<string, unknown> | undefined
					should(
						`phrase_request ${m.original.id} server row matches the submitted update`,
						!row ||
							Object.entries(m.changes).every(
								([k, v]) =>
									k === 'updated_at' || k === 'created_at' || row[k] === v
							),
						{ submitted: m.changes, returned: row }
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
			console.log(`Loading phraseRequestUpvotesCollection`)
			const { data } = await supabase
				.from('phrase_request_upvote')
				.select('request_id')
				.throwOnError()
			return data?.map((item) => PhraseRequestUpvoteSchema.parse(item)) ?? []
		},
		getKey: (item: PhraseRequestUpvoteType) => item.request_id,
		queryClient,
		schema: PhraseRequestUpvoteSchema,
		onInsert: async ({ transaction }) => {
			try {
				await Promise.all(
					transaction.mutations.map(async (m) => {
						const { error } = await supabase.rpc('set_phrase_request_upvote', {
							p_request_id: m.modified.request_id,
							p_action: 'add',
						})
						if (error) throw error
					})
				)
				// Mirror the trigger-maintained upvote_count bump into the parent
				// collection if it's loaded. ±1 may drift by 1 in the 'no_change'
				// edge case (issue #647 tracks the proper RPC-returns-count fix).
				if (phraseRequestsCollection.status === 'ready') {
					for (const m of transaction.mutations) {
						const parent = phraseRequestsCollection.get(m.modified.request_id)
						if (parent) {
							phraseRequestsCollection.utils.writeUpdate({
								id: m.modified.request_id,
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
						const { error } = await supabase.rpc('set_phrase_request_upvote', {
							p_request_id: m.original.request_id,
							p_action: 'remove',
						})
						if (error) throw error
					})
				)
				if (phraseRequestsCollection.status === 'ready') {
					for (const m of transaction.mutations) {
						const parent = phraseRequestsCollection.get(m.original.request_id)
						if (parent) {
							phraseRequestsCollection.utils.writeUpdate({
								id: m.original.request_id,
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
					// Confirm the server's returned row matches the optimistic
					// edit. The row-guard lives inside should() so the whole call
					// strips cleanly from production builds.
					const row = data?.[0] as Record<string, unknown> | undefined
					should(
						`request_comment ${m.original.id} server row matches the submitted update`,
						!row ||
							Object.entries(m.changes).every(
								([k, v]) =>
									k === 'updated_at' || k === 'created_at' || row[k] === v
							),
						{ submitted: m.changes, returned: row }
					)
				})
			)
			return { refetch: false }
		},
		onDelete: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const { data } = await supabase
						.from('request_comment')
						.delete()
						.eq('id', m.original.id)
						.select()
						.throwOnError()
					// A delete with .select() returns the rows it removed; confirm
					// we removed exactly the targeted comment. Stripped from
					// production by the Vite plugin.
					should(
						`request_comment delete removed comment ${m.original.id}`,
						data?.length === 1 && data[0].id === m.original.id,
						{ targetId: m.original.id, returned: data }
					)
				})
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
			console.log(`Loading commentUpvotesCollection`)
			const { data } = await supabase
				.from('comment_upvote')
				.select('comment_id')
				.throwOnError()
			return data?.map((item) => CommentUpvoteSchema.parse(item)) ?? []
		},
		// this is a one-column table consisting of comment IDs only
		getKey: (item: CommentUpvoteType) => item.comment_id,
		queryClient,
		schema: CommentUpvoteSchema,
		onInsert: async ({ transaction }) => {
			try {
				await Promise.all(
					transaction.mutations.map(async (m) => {
						const { error } = await supabase.rpc('set_comment_upvote', {
							p_comment_id: m.modified.comment_id,
							p_action: 'add',
						})
						if (error) throw error
					})
				)
				if (commentsCollection.status === 'ready') {
					for (const m of transaction.mutations) {
						const parent = commentsCollection.get(m.modified.comment_id)
						if (parent) {
							commentsCollection.utils.writeUpdate({
								id: m.modified.comment_id,
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
						const { error } = await supabase.rpc('set_comment_upvote', {
							p_comment_id: m.original.comment_id,
							p_action: 'remove',
						})
						if (error) throw error
					})
				)
				if (commentsCollection.status === 'ready') {
					for (const m of transaction.mutations) {
						const parent = commentsCollection.get(m.original.comment_id)
						if (parent) {
							commentsCollection.utils.writeUpdate({
								id: m.original.comment_id,
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
