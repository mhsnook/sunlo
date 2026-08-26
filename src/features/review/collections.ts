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
import {
	allRowsMatch,
	rowMatches,
	writeSyncedRow,
	writeSyncedRows,
} from '@/lib/collections/synced-row'
import { should } from '@scenetest/checks/react'
import type { TablesUpdate } from '@/types/supabase'

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
		// validate the values.
		onInsert: async ({ transaction }) => {
			const rows = transaction.mutations.map((m) => m.modified)
			const { data } = await supabase
				.from('user_card_review')
				.insert(rows)
				.select()
				.throwOnError()
			const returned = data?.map((row) => CardReviewSchema.parse(row)) ?? []
			should(
				'user_card_review insert returned one row per review submitted',
				allRowsMatch(rows, returned),
				{ submitted: rows, returned }
			)
			writeSyncedRows(cardReviewsCollection, returned)
			return { refetch: false }
		},
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const changes = m.changes as TablesUpdate<'user_card_review'>
					const { data } = await supabase
						.from('user_card_review')
						.update(changes)
						.eq('id', m.original.id)
						.select()
						.throwOnError()
					const row = data?.[0]
					should(
						`user_card_review ${m.original.id} server row matches the submitted update`,
						rowMatches(changes, row),
						{ submitted: changes, returned: row }
					)
					if (row)
						writeSyncedRow(cardReviewsCollection, CardReviewSchema.parse(row))
				})
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
		// A session is written once and never updated: the manifest is fixed, and
		// progress lives in user_review_milestone.
		onInsert: async ({ transaction }) => {
			const rows = transaction.mutations.map((m) => m.modified)
			const { data } = await supabase
				.from('user_review_session')
				.insert(rows)
				.select()
				.throwOnError()
			const returned = data?.map((row) => ReviewSessionSchema.parse(row)) ?? []
			should(
				'user_review_session insert returned one row per session submitted',
				allRowsMatch(rows, returned),
				{ submitted: rows, returned }
			)
			writeSyncedRows(reviewSessionsCollection, returned)
			return { refetch: false }
		},
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
		// Append-only: the row (client-generated id + created_at) is built at the
		// call site and just persisted here.
		onInsert: async ({ transaction }) => {
			const rows = transaction.mutations.map((m) => m.modified)
			const { data } = await supabase
				.from('user_review_milestone')
				.insert(rows)
				.select()
				.throwOnError()
			const returned =
				data?.map((row) => ReviewMilestoneSchema.parse(row)) ?? []
			should(
				'user_review_milestone insert returned one row per milestone submitted',
				allRowsMatch(rows, returned),
				{ submitted: rows, returned }
			)
			writeSyncedRows(reviewMilestonesCollection, returned)
			return { refetch: false }
		},
	})
)
