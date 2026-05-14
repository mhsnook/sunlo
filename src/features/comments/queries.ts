import { queryOptions } from '@tanstack/react-query'
import {
	RequestCommentSchema,
	CommentPhraseLinkSchema,
	CommentUpvoteSchema,
} from './schemas'
import supabase from '@/lib/supabase-client'

export const commentsQuery = queryOptions({
	queryKey: ['public', 'request_comment'] as const,
	queryFn: async () => {
		const { data } = await supabase
			.from('request_comment')
			.select()
			.throwOnError()
		return data?.map((item) => RequestCommentSchema.parse(item)) ?? []
	},
})

export const commentPhraseLinksQuery = queryOptions({
	queryKey: ['public', 'comment_phrase_link'] as const,
	queryFn: async () => {
		const { data } = await supabase
			.from('comment_phrase_link')
			.select()
			.throwOnError()
		return data?.map((item) => CommentPhraseLinkSchema.parse(item)) ?? []
	},
})

export const commentUpvotesQuery = queryOptions({
	queryKey: ['user', 'comment_upvote'] as const,
	queryFn: async () => {
		const { data } = await supabase
			.from('comment_upvote')
			.select('comment_id')
			.throwOnError()
		return data?.map((item) => CommentUpvoteSchema.parse(item)) ?? []
	},
})
