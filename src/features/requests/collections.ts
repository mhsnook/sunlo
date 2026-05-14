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
			try {
				await Promise.all(
					transaction.mutations.map((m) =>
						supabase
							.from('phrase_request')
							.update(m.changes)
							.eq('id', m.original.id)
							.throwOnError()
					)
				)
				return { refetch: false }
			} catch (err) {
				toastError('Failed to save your changes — please try again')
				throw err
			}
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
			try {
				await Promise.all(
					transaction.mutations.map((m) =>
						supabase
							.from('request_comment')
							.update(m.changes)
							.eq('id', m.original.id)
							.throwOnError()
					)
				)
				return { refetch: false }
			} catch (err) {
				toastError('Failed to save your comment — please try again')
				throw err
			}
		},
		onDelete: async ({ transaction }) => {
			try {
				await Promise.all(
					transaction.mutations.map((m) =>
						supabase
							.from('request_comment')
							.delete()
							.eq('id', m.original.id)
							.throwOnError()
					)
				)
				// Cascade-deleted replies and phrase links linger in the local
				// collections until the next stale refetch, but they don't render
				// (orphaned replies have no parent anchor; orphaned phrase links
				// filter out of the provenance inner-join). Skipping the full-table
				// refetch is worth that small inconsistency.
				return { refetch: false }
			} catch (err) {
				toastError('Failed to delete comment — please try again')
				throw err
			}
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
