import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import {
	RequestCommentSchema,
	type RequestCommentType,
	CommentPhraseLinkSchema,
	type CommentPhraseLinkType,
	CommentUpvoteSchema,
	type CommentUpvoteType,
	PhraseCommentSchema,
	type PhraseCommentType,
	CommentTranslationLinkSchema,
	type CommentTranslationLinkType,
	PhraseCommentUpvoteSchema,
	type PhraseCommentUpvoteType,
} from './schemas'
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'

// Helper for tables that exist after migration but aren't in generated types yet.
// Remove after running `pnpm run types`.
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
async function queryUntyped(table: string, columns = '*') {
	const { data } = await (supabase as any)
		.from(table)
		.select(columns)
		.throwOnError()
	return (data ?? []) as Array<Record<string, unknown>>
}
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

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

export const phraseCommentsCollection = createCollection(
	queryCollectionOptions({
		id: 'phrase_comments',
		queryKey: ['public', 'phrase_comment'],
		queryFn: async () => {
			console.log(`Loading phraseCommentsCollection`)
			const data = await queryUntyped('phrase_comment')
			return data.map((item) => PhraseCommentSchema.parse(item))
		},
		getKey: (item: PhraseCommentType) => item.id,
		queryClient,
		schema: PhraseCommentSchema,
	})
)

export const commentTranslationLinksCollection = createCollection(
	queryCollectionOptions({
		id: 'comment_translation_links',
		queryKey: ['public', 'comment_translation_link'],
		queryFn: async () => {
			console.log(`Loading commentTranslationLinksCollection`)
			const data = await queryUntyped('comment_translation_link')
			return data.map((item) => CommentTranslationLinkSchema.parse(item))
		},
		getKey: (item: CommentTranslationLinkType) => item.id,
		queryClient,
		schema: CommentTranslationLinkSchema,
	})
)

export const phraseCommentUpvotesCollection = createCollection(
	queryCollectionOptions({
		id: 'phrase_comment_upvotes',
		queryKey: ['user', 'phrase_comment_upvote'],
		queryFn: async () => {
			console.log(`Loading phraseCommentUpvotesCollection`)
			const data = await queryUntyped('phrase_comment_upvote', 'comment_id')
			return data.map((item) => PhraseCommentUpvoteSchema.parse(item))
		},
		getKey: (item: PhraseCommentUpvoteType) => item.comment_id,
		queryClient,
		schema: PhraseCommentUpvoteSchema,
	})
)
