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
		// FSRS values + the client-generated id are computed in the review hook
		// and carried on the row; the handler just persists it. CHECK constraints
		// on the table validate the values. updated_at null -> undefined lets the
		// DB default (now()) fill a fresh row.
		onInsert: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map((m) =>
					supabase
						.from('user_card_review')
						.insert({
							...m.modified,
							updated_at: m.modified.updated_at ?? undefined,
						})
						.throwOnError()
				)
			)
			return { refetch: false }
		},
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map((m) =>
					supabase
						.from('user_card_review')
						.update({
							...m.changes,
							updated_at: m.changes.updated_at ?? undefined,
						})
						.eq('id', m.original.id)
						.throwOnError()
				)
			)
			return { refetch: false }
		},
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
