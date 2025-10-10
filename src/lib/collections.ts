import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import {
	PhraseFullSchema,
	PublicProfileSchema,
	PhraseRequestSchema,
	PublicProfileType,
} from './schemas'

export const publicProfilesCollection = createCollection(
	queryCollectionOptions({
		queryKey: ['public', 'profiles'],
		queryFn: async () => {
			const response = await fetch('/api/todos')
			return response.json()
		},
		getKey: (item: PublicProfileType) => item.uid,
		schema: PublicProfileSchema, // any standard schema
	})
)

export const phraseRequestsCollection = createCollection()

export const phrasesCollection = createCollection()

export const collections = {
	publicProfiles: publicProfilesCollection,
	phraseRequests: phraseRequestsCollection,
	phrases: metaPhraseInfoSchema,
}
