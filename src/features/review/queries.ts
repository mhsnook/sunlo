import { queryOptions } from '@tanstack/react-query'
import { CardReviewSchema, DailyReviewStateSchema } from './schemas'
import supabase from '@/lib/supabase-client'

export const cardReviewsQuery = queryOptions({
	queryKey: ['user', 'card_review'] as const,
	queryFn: async () => {
		const { data } = await supabase
			.from('user_card_review')
			.select()
			.throwOnError()
		return data?.map((item) => CardReviewSchema.parse(item)) ?? []
	},
})

export const reviewDaysQuery = queryOptions({
	queryKey: ['user', 'daily_review_state'] as const,
	queryFn: async () => {
		const { data } = await supabase
			.from('user_deck_review_state')
			.select()
			.throwOnError()
		return data?.map((item) => DailyReviewStateSchema.parse(item)) ?? []
	},
})
