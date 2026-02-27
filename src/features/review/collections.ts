import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import {
	CardReviewSchema,
	type CardReviewType,
	DailyReviewStateSchema,
	type DailyReviewStateType,
} from './schemas'
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'

export const cardReviewsCollection = createCollection(
	queryCollectionOptions({
		id: 'card_reviews',
		queryKey: ['user', 'card_review'],
		queryFn: async () => {
			console.log(`Loading cardReviewsCollection`)
			const { data } = await supabase
				.from('user_card_review')
				.select()
				.throwOnError()
			return data?.map((item) => CardReviewSchema.parse(item)) ?? []
		},
		getKey: (item: CardReviewType) => item.id,
		queryClient,
		startSync: false,
		schema: CardReviewSchema,
	})
)

export const reviewDaysCollection = createCollection(
	queryCollectionOptions({
		id: 'review_days',
		queryKey: ['user', 'daily_review_state'],
		queryFn: async () => {
			console.log(`Loading reviewDaysCollection`)
			const { data } = await supabase
				.from('user_deck_review_state')
				.select()
				.throwOnError()
			return data?.map((item) => DailyReviewStateSchema.parse(item)) ?? []
		},
		getKey: (item: DailyReviewStateType) =>
			`${item.day_session}--${item.lang}`,
		queryClient,
		startSync: false,
		schema: DailyReviewStateSchema,
	})
)
