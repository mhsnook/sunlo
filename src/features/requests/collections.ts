import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { BasicIndex } from '@tanstack/db'
import {
	PhraseRequestSchema,
	type PhraseRequestType,
	PhraseRequestUpvoteSchema,
	type PhraseRequestUpvoteType,
} from './schemas'
import { phraseRequestsQuery, phraseRequestUpvotesQuery } from './queries'
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'

export { phraseRequestsQuery, phraseRequestUpvotesQuery }

export const phraseRequestsCollection = createCollection(
	queryCollectionOptions({
		id: 'phrase_requests',
		queryKey: phraseRequestsQuery.queryKey,
		queryFn: phraseRequestsQuery.queryFn!,
		getKey: (item: PhraseRequestType) => item.id,
		schema: PhraseRequestSchema,
		queryClient,
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map((m) =>
					supabase
						.from('phrase_request')
						.update(m.changes)
						.eq('id', m.original.id)
						.throwOnError()
				)
			)
			return { refetch: false }
		},
	})
)

export const phraseRequestUpvotesCollection = createCollection(
	queryCollectionOptions({
		id: 'phrase_request_upvotes',
		queryKey: phraseRequestUpvotesQuery.queryKey,
		queryFn: phraseRequestUpvotesQuery.queryFn!,
		getKey: (item: PhraseRequestUpvoteType) => item.request_id,
		queryClient,
		schema: PhraseRequestUpvoteSchema,
	})
)
