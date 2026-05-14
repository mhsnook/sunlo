import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { BasicIndex } from '@tanstack/db'
import {
	RequestCommentSchema,
	type RequestCommentType,
	CommentPhraseLinkSchema,
	type CommentPhraseLinkType,
	CommentUpvoteSchema,
	type CommentUpvoteType,
} from './schemas'
import {
	commentsQuery,
	commentPhraseLinksQuery,
	commentUpvotesQuery,
} from './queries'
import { queryClient } from '@/lib/query-client'

export { commentsQuery, commentPhraseLinksQuery, commentUpvotesQuery }

export const commentsCollection = createCollection(
	queryCollectionOptions({
		id: 'request_comments',
		queryKey: commentsQuery.queryKey,
		queryFn: commentsQuery.queryFn!,
		getKey: (item: RequestCommentType) => item.id,
		queryClient,
		schema: RequestCommentSchema,
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
	})
)

export const commentPhraseLinksCollection = createCollection(
	queryCollectionOptions({
		id: 'comment_phrase_links',
		queryKey: commentPhraseLinksQuery.queryKey,
		queryFn: commentPhraseLinksQuery.queryFn!,
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
		queryKey: commentUpvotesQuery.queryKey,
		queryFn: commentUpvotesQuery.queryFn!,
		// this is a one-column table consisting of comment IDs only
		getKey: (item: CommentUpvoteType) => item.comment_id,
		queryClient,
		schema: CommentUpvoteSchema,
	})
)
