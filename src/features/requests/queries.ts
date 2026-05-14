import { queryOptions } from '@tanstack/react-query'
import { PhraseRequestSchema, PhraseRequestUpvoteSchema } from './schemas'
import supabase from '@/lib/supabase-client'

export const phraseRequestsQuery = queryOptions({
	queryKey: ['public', 'phrase_request'] as const,
	queryFn: async () => {
		const { data } = await supabase
			.from('phrase_request')
			.select()
			.throwOnError()
		return data?.map((p) => PhraseRequestSchema.parse(p)) ?? []
	},
})

export const phraseRequestUpvotesQuery = queryOptions({
	queryKey: ['user', 'phrase_request_upvote'] as const,
	queryFn: async () => {
		const { data } = await supabase
			.from('phrase_request_upvote')
			.select('request_id')
			.throwOnError()
		return data?.map((item) => PhraseRequestUpvoteSchema.parse(item)) ?? []
	},
})
