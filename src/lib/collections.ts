import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'

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
	FriendSummarySchema,
	type FriendSummaryType,
	ChatMessageSchema,
	type ChatMessageType,
	DeckMetaRawSchema,
	LangTagSchema,
	type LangTagType,
} from './schemas'
import { queryClient } from './query-client'
import supabase from './supabase-client'
import { sortDecksByCreation } from './utils'
import { themes } from './deck-themes'
import { queryOptions } from '@tanstack/react-query'
import languages from './languages'

export const publicProfilesCollection = createCollection(
	queryCollectionOptions({
		id: 'public_profiles',
		queryKey: ['public', 'profiles'],
		queryFn: async () => {
			console.log(`Loading publicProfilesCollection`)
			const { data } = await supabase
				.from('public_profile')
				.select()
				.throwOnError()
			return data?.map((p) => PublicProfileSchema.parse(p)) ?? []
		},
		getKey: (item: PublicProfileType) => item.uid,
		queryClient,
		schema: PublicProfileSchema,
	})
)

export const phraseRequestsCollection = createCollection(
	queryCollectionOptions({
		id: 'phrase_requests',
		queryKey: ['public', 'phrase_request'],
		queryFn: async () => {
			console.log(`Loading phraseRequestscollection`)

			const { data } = await supabase
				.from('meta_phrase_request')
				.select()
				.throwOnError()
			return data?.map((p) => PhraseRequestSchema.parse(p)) ?? []
		},
		getKey: (item: PhraseRequestType) => item.id,
		schema: PhraseRequestSchema,
		queryClient,
	})
)

export const phrasesCollection = createCollection(
	queryCollectionOptions({
		id: 'phrases',
		queryKey: ['public', 'phrase_full'],
		getKey: (item: PhraseFullType) => item.id,
		queryFn: async () => {
			console.log(`Loading phrasesCollection`)

			const { data } = await supabase
				.from('meta_phrase_info')
				.select('*, translations:phrase_translation(*)')
				.throwOnError()
			return data?.map((p) => PhraseFullSchema.parse(p)) ?? []
		},
		schema: PhraseFullSchema,
		queryClient,
	})
)

export const langTagsCollection = createCollection(
	queryCollectionOptions({
		id: 'lang_tags',
		queryKey: ['public', 'lang_tag'],
		getKey: (item: LangTagType) => item.id,
		queryFn: async () => {
			console.log(`Loading langTagsCollection`)
			const { data } = await supabase.from('tag').select().throwOnError()
			return data?.map((p) => LangTagSchema.parse(p)) ?? []
		},
		schema: LangTagSchema,
		queryClient,
	})
)

export const languagesCollection = createCollection(
	queryCollectionOptions({
		id: 'languages',
		queryKey: ['public', 'meta_language'],
		queryFn: async () => {
			console.log(`Loading languagesCollection`)
			const { data } = await supabase
				.from('meta_language')
				.select()
				.throwOnError()
			return data?.map((item) => LanguageSchema.parse(item)) ?? []
		},
		getKey: (item: LanguageType) => item.lang,
		schema: LanguageSchema,
		queryClient,
	})
)

export const myProfileQuery = queryOptions({
	queryKey: ['user', 'profile'],
	queryFn: async (_) => {
		console.log(`Running myProfileQuery`)
		const { data } = await supabase
			.from('user_profile')
			.select()
			.throwOnError()
			.maybeSingle()
		if (!data) return []
		return [MyProfileSchema.parse(data)]
	},
})

export const myProfileCollection = createCollection(
	queryCollectionOptions({
		id: 'my_profile',
		queryKey: myProfileQuery.queryKey,
		queryFn: async (args) => {
			console.log(`Loading myProfileCollection`)
			return myProfileQuery.queryFn!(args)
		},
		getKey: (item: MyProfileType) => item.uid,
		queryClient,
		startSync: false,
		schema: MyProfileSchema,
	})
)

export const decksCollection = createCollection(
	queryCollectionOptions({
		id: 'decks',
		queryKey: ['user', 'deck_plus'],
		queryFn: async () => {
			console.log(`Loading decksCollection`)
			const { data } = await supabase
				.from('user_deck_plus')
				.select()
				.throwOnError()
			return (
				data
					?.map((item) => DeckMetaRawSchema.parse(item))
					.toSorted(sortDecksByCreation)
					.map((d, i) => ({
						...d,
						theme: i % themes.length,
						language: languages[d.lang],
					})) ?? []
			)
		},
		getKey: (item: DeckMetaType) => item.lang,
		queryClient,
		startSync: false,
		schema: DeckMetaSchema,
	})
)

export const cardsCollection = createCollection(
	queryCollectionOptions({
		id: 'cards',
		queryKey: ['user', 'card'],
		queryFn: async () => {
			console.log(`Loading cardsCollection`)
			const { data } = await supabase
				.from('user_card_plus')
				.select()
				.throwOnError()
			return data?.map((item) => CardMetaSchema.parse(item)) ?? []
		},
		getKey: (item: CardMetaType) => item.phrase_id,
		queryClient,
		startSync: false,
		schema: CardMetaSchema,
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
		getKey: (item: DailyReviewStateType) => item.day_session,
		queryClient,
		startSync: false,
		schema: DailyReviewStateSchema,
	})
)

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

export const friendSummariesCollection = createCollection(
	queryCollectionOptions({
		id: 'friends',
		queryKey: ['user', 'friend_summary'],
		queryFn: async () => {
			console.log(`Loading friendSummariesCollection`)
			const { data } = await supabase
				.from('friend_summary')
				.select()
				.throwOnError()
			return data?.map((item) => FriendSummarySchema.parse(item)) ?? []
		},
		getKey: (item: FriendSummaryType) => `${item.uid_less}--${item.uid_more}`,
		queryClient,
		startSync: false,
		schema: FriendSummarySchema,
	})
)

export const chatMessagesCollection = createCollection(
	queryCollectionOptions({
		id: 'chat_messages',
		queryKey: ['user', 'chat_message'],
		queryFn: async () => {
			console.log(`Loading chatMessagesCollection`)
			const { data } = await supabase
				.from('chat_message')
				.select()
				.throwOnError()
			return data?.map((item) => ChatMessageSchema.parse(item)) ?? []
		},
		getKey: (item: ChatMessageType) => item.id,
		queryClient,
		startSync: false,
		schema: ChatMessageSchema,
	})
)

export const clearUser = async () => {
	await Promise.all([
		myProfileCollection.cleanup(),
		decksCollection.cleanup(),
		cardsCollection.cleanup(),
		reviewDaysCollection.cleanup(),
		cardReviewsCollection.cleanup(),
		friendSummariesCollection.cleanup(),
		chatMessagesCollection.cleanup(),
	])
}
