import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { BasicIndex } from '@tanstack/db'
import {
	PhraseRequestSchema,
	type PhraseRequestType,
	PhraseRequestUpvoteSchema,
	type PhraseRequestUpvoteType,
} from './schemas'
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'

export const phraseRequestsCollection = createCollection(
	queryCollectionOptions({
		id: 'phrase_requests',
		queryKey: ['public', 'phrase_request'],
		queryFn: async () => {
			console.log(`Loading phraseRequestscollection`)

			const { data } = await supabase
				.from('phrase_request')
				.select()
				.throwOnError()
			return data?.map((p) => PhraseRequestSchema.parse(p)) ?? []
		},
		getKey: (item: PhraseRequestType) => item.id,
		schema: PhraseRequestSchema,
		queryClient,
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
	})
)

export const phraseRequestUpvotesCollection = createCollection(
	queryCollectionOptions({
		id: 'phrase_request_upvotes',
		queryKey: ['user', 'phrase_request_upvote'],
		queryFn: async () => {
			console.log(`Loading phraseRequestUpvotesCollection`)
			const { data } = await supabase
				.from('phrase_request_upvote')
				.select('request_id')
				.throwOnError()
			return data?.map((item) => PhraseRequestUpvoteSchema.parse(item)) ?? []
		},
		getKey: (item: PhraseRequestUpvoteType) => item.request_id,
		queryClient,
		schema: PhraseRequestUpvoteSchema,
	})
)
