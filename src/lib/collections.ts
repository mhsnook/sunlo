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

export const publicProfilesCollection = createCollection(
	queryCollectionOptions({
		queryKey: ['public', 'profiles'],
		queryFn: async () => {
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
		queryKey: ['public', 'phrase_request'],
		queryFn: async () => {
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
		queryKey: ['public', 'phrase_full'],
		getKey: (item: PhraseFullType) => item.id,
		queryFn: async () => {
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
		queryKey: ['public', 'lang_tag'],
		getKey: (item: LangTagType) => item.id,
		queryFn: async () => {
			const { data } = await supabase.from('tag').select().throwOnError()
			return data?.map((p) => LangTagSchema.parse(p)) ?? []
		},
		schema: LangTagSchema,
		queryClient,
	})
)

export const languagesCollection = createCollection(
	queryCollectionOptions({
		queryKey: ['public', 'meta_language'],
		queryFn: async () => {
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
			return data
				?.map((item) => DeckMetaRawSchema.parse(item))
				.toSorted(sortDecksByCreation)
				.map((d, i) => ({
					...d,
					theme: i % themes.length,
				}))
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
			const { data } = await supabase
				.from('user_card_plus')
				.select()
				.throwOnError()
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
		getKey: (item: CardReviewType) => item.id,
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
