import { createCollection } from '@tanstack/react-db'
import { localOnlyCollectionOptions } from '@tanstack/react-db'
import {
	PhraseFullSchema,
	PublicProfileSchema,
	type PublicProfileType,
	type PhraseFullType,
} from './schemas'

export const publicProfilesCollection = createCollection(
	localOnlyCollectionOptions({
		id: 'public_profiles',
		getKey: (item: PublicProfileType) => item.uid,
		schema: PublicProfileSchema,
	})
)

export const phraseRequestsCollection = createCollection()

export const phrasesCollection = createCollection(
	localOnlyCollectionOptions({
		id: 'phrases_full',
		getKey: (item: PhraseFullType) => item.id,
		schema: PhraseFullSchema,
	})
)

export const collections = {
	publicProfiles: publicProfilesCollection,
	phraseRequests: phraseRequestsCollection,
	phrases: phrasesCollection,
}
