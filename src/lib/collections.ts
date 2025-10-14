import { createCollection } from '@tanstack/react-db'
import { localOnlyCollectionOptions } from '@tanstack/react-db'
import {
	PhraseFullSchema,
	type PhraseFullType,
	PublicProfileSchema,
	type PublicProfileType,
	PhraseRequestSchema,
	type PhraseRequestType,
	LanguageSchema,
	type LanguageType,
	DeckMetaSchema,
	type DeckMetaType,
	CardMetaSchema,
	type CardMetaType,
	CardReviewSchema,
	type CardReviewType,
	DailyReviewStateSchema,
	type DailyReviewStateType,
	MyProfileSchema,
	type MyProfileType,
} from './schemas'

export const publicProfilesCollection = createCollection(
	localOnlyCollectionOptions({
		id: 'public_profiles',
		getKey: (item: PublicProfileType) => item.uid,
		schema: PublicProfileSchema,
	})
)

export const myProfileCollection = createCollection(
	localOnlyCollectionOptions({
		id: 'my_profile',
		getKey: (item: MyProfileType) => item.uid,
		schema: MyProfileSchema,
	})
)
export const phraseRequestsCollection = createCollection(
	localOnlyCollectionOptions({
		id: 'phrase_requests',
		getKey: (item: PhraseRequestType) => item.id,
		schema: PhraseRequestSchema,
	})
)

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

export const languagesCollection = createCollection(
	localOnlyCollectionOptions({
		id: 'language_meta',
		getKey: (item: LanguageType) => item.lang,
		schema: LanguageSchema,
	})
)

export const decksCollection = createCollection(
	localOnlyCollectionOptions({
		id: 'deck_meta',
		getKey: (item: DeckMetaType) => item.lang,
		schema: DeckMetaSchema,
	})
)

export const cardsCollection = createCollection(
	localOnlyCollectionOptions({
		id: 'card_meta',
		getKey: (item: CardMetaType) => item.phrase_id,
		schema: CardMetaSchema,
	})
)

export const reviewsCollection = createCollection(
	localOnlyCollectionOptions({
		id: 'card_review',
		getKey: (item: CardReviewType) => item.id,
		schema: CardReviewSchema,
	})
)

export const reviewDaysCollection = createCollection(
	localOnlyCollectionOptions({
		id: 'daily_review_state',
		getKey: (item: DailyReviewStateType) => item.day_session,
		schema: DailyReviewStateSchema,
	})
)
