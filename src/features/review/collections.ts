import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import {
	CardReviewSchema,
	type CardReviewType,
	DailyReviewStateSchema,
	type DailyReviewStateType,
} from './schemas'
import { cardReviewsQuery, reviewDaysQuery } from './queries'
import { queryClient } from '@/lib/query-client'

export { cardReviewsQuery, reviewDaysQuery }

export const cardReviewsCollection = createCollection(
	queryCollectionOptions({
		id: 'card_reviews',
		queryKey: cardReviewsQuery.queryKey,
		queryFn: cardReviewsQuery.queryFn!,
		getKey: (item: CardReviewType) => item.id,
		queryClient,
		startSync: false,
		schema: CardReviewSchema,
	})
)

export const reviewDaysCollection = createCollection(
	queryCollectionOptions({
		id: 'review_days',
		queryKey: reviewDaysQuery.queryKey,
		queryFn: reviewDaysQuery.queryFn!,
		getKey: (item: DailyReviewStateType) => `${item.day_session}--${item.lang}`,
		queryClient,
		startSync: false,
		schema: DailyReviewStateSchema,
	})
)
