import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import {
	CardReviewSchema,
	type CardReviewType,
	ReviewSessionSchema,
	type ReviewSessionType,
	ReviewMilestoneSchema,
	type ReviewMilestoneType,
} from './schemas'
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'

export const cardReviewsCollection = createCollection(
	queryCollectionOptions({
		id: 'card_reviews',
		queryKey: ['user', 'card_review'],
		queryFn: async () => {
			if (!(await supabase.auth.getSession()).data?.session) return []
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

export const reviewSessionsCollection = createCollection(
	queryCollectionOptions({
		id: 'review_sessions',
		queryKey: ['user', 'user_review_session'],
		queryFn: async () => {
			if (!(await supabase.auth.getSession()).data?.session) return []
			console.log(`Loading reviewSessionsCollection`)
			const { data } = await supabase
				.from('user_review_session')
				.select()
				.throwOnError()
			return data?.map((item) => ReviewSessionSchema.parse(item)) ?? []
		},
		getKey: (item: ReviewSessionType) => `${item.day_session}--${item.lang}`,
		queryClient,
		startSync: false,
		schema: ReviewSessionSchema,
	})
)

export const reviewMilestonesCollection = createCollection(
	queryCollectionOptions({
		id: 'review_milestones',
		queryKey: ['user', 'user_review_milestone'],
		queryFn: async () => {
			if (!(await supabase.auth.getSession()).data?.session) return []
			console.log(`Loading reviewMilestonesCollection`)
			const { data } = await supabase
				.from('user_review_milestone')
				.select()
				.throwOnError()
			return data?.map((item) => ReviewMilestoneSchema.parse(item)) ?? []
		},
		getKey: (item: ReviewMilestoneType) => item.id,
		queryClient,
		startSync: false,
		schema: ReviewMilestoneSchema,
	})
)
