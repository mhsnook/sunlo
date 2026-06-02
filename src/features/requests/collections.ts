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
					// Fold the server's truth into synced state so the optimistic
					// overlay doesn't evaporate if the collection is re-synced.
					// Soft-deletes hide the row from RLS; mirror that locally.
					if (row) {
						phraseRequestsCollection.utils.writeUpdate(
							PhraseRequestSchema.parse(row)
						)
					} else {
						phraseRequestsCollection.utils.writeDelete(m.original.id)
					}
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
					// Fold the server's truth into synced state so the optimistic
					// overlay survives a re-sync.
					if (row) {
						commentsCollection.utils.writeUpdate(
							RequestCommentSchema.parse(row)
						)
					}
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
					// Fold the delete into synced state so the row doesn't reappear
					// on a re-sync.
					commentsCollection.utils.writeDelete(m.original.id)
				})
			)
			// Cascade-deleted replies and phrase links still linger in their own
			// collections until the next stale refetch, but they don't render
			// (orphaned replies have no parent anchor; orphaned phrase links
			// filter out of the provenance inner-join). Worth that small
			// inconsistency to skip the full-table refetch.
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
	})
)
