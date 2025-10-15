import {
	createCollection,
	localOnlyCollectionOptions,
} from '@tanstack/react-db'
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
	FriendSummaryType,
	ChatMessageSchema,
	ChatMessageType,
} from './schemas'
import { queryClient } from '@/main.tsx'
import supabase from './supabase-client'

export const publicProfilesCollection = createCollection(
	localOnlyCollectionOptions({
		id: 'public_profiles',
		getKey: (item: PublicProfileType) => item.uid,
		schema: PublicProfileSchema,
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

export const languagesCollection = createCollection(
	localOnlyCollectionOptions({
		id: 'language_meta',
		getKey: (item: LanguageType) => item.lang,
		schema: LanguageSchema,
	})
)

export const myProfileCollection = createCollection(
	queryCollectionOptions({
		queryKey: ['user', 'profile'],
		queryFn: async () => {
			const { data } = await supabase
				.from('user_profile')
				.select()
				.throwOnError()
				.maybeSingle()
			if (!data) return []
			return [MyProfileSchema.parse(data)]
		},
		getKey: (item: MyProfileType) => item.uid,
		queryClient,
		schema: MyProfileSchema,
	})
)

export const decksCollection = createCollection(
	queryCollectionOptions({
		queryKey: ['user', 'deck_plus'],
		queryFn: async () => {
			const { data } = await supabase
				.from('user_deck_plus')
				.select()
				.throwOnError()
			return data?.map((item) => DeckMetaSchema.parse(item)) ?? []
		},
		getKey: (item: DeckMetaType) => item.lang,
		queryClient,
		schema: DeckMetaSchema,
	})
)

export const cardsCollection = createCollection(
	queryCollectionOptions({
		queryKey: ['user', 'card'],
		queryFn: async () => {
			const { data } = await supabase.from('user_card').select().throwOnError()
			return data?.map((item) => CardMetaSchema.parse(item)) ?? []
		},
		getKey: (item: CardMetaType) => item.phrase_id,
		queryClient,
		schema: CardMetaSchema,
	})
)

export const reviewDaysCollection = createCollection(
	queryCollectionOptions({
		queryKey: ['user', 'daily_review_state'],
		queryFn: async () => {
			const { data } = await supabase
				.from('user_deck_review_state')
				.select()
				.throwOnError()
			return data?.map((item) => DailyReviewStateSchema.parse(item)) ?? []
		},
		getKey: (item: DailyReviewStateType) => item.day_session,
		queryClient,
		schema: DailyReviewStateSchema,
	})
)

export const cardReviewsCollection = createCollection(
	queryCollectionOptions({
		queryKey: ['user', 'card_review'],
		queryFn: async () => {
			const { data } = await supabase
				.from('user_card_review')
				.select()
				.throwOnError()
			return data?.map((item) => CardReviewSchema.parse(item)) ?? []
		},
		getKey: (item: CardReviewType) => item.day_session,
		queryClient,
		schema: CardReviewSchema,
	})
)

export const friendSummariesCollection = createCollection(
	queryCollectionOptions({
		queryKey: ['user', 'friend_summary'],
		queryFn: async () => {
			const { data } = await supabase
				.from('friend_summary')
				.select()
				.throwOnError()
			return data?.map((item) => FriendSummarySchema.parse(item)) ?? []
		},
		getKey: (item: FriendSummaryType) => `${item.uid_less}--${item.uid_more}`,
		queryClient,
		schema: FriendSummarySchema,
	})
)

export const chatMessagesCollection = createCollection(
	queryCollectionOptions({
		queryKey: ['user', 'chat_message'],
		queryFn: async () => {
			const { data } = await supabase
				.from('chat_message')
				.select()
				.throwOnError()
			return data?.map((item) => ChatMessageSchema.parse(item)) ?? []
		},
		getKey: (item: ChatMessageType) => item.id,
		queryClient,
		schema: ChatMessageSchema,
	})
)
