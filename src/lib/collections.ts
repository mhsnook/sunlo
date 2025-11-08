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
import type { uuid } from '@/types/main'
import { themes } from './deck-themes'

export const publicProfilesCollection = createCollection(
	queryCollectionOptions({
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

export const profileOptions = (userId: uuid) =>
	queryCollectionOptions({
		queryKey: ['user', userId, 'profile'],
		queryFn: async () => {
			console.log(`Loading myProfileCollection`)
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
		enabled: !!userId,
		schema: MyProfileSchema,
	})

export const decksOptions = (userId: uuid) =>
	queryCollectionOptions({
		queryKey: ['user', userId, 'deck_plus'],
		queryFn: async () => {
			console.log(`Loading decks collection`)
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
					})) ?? []
			)
		},
		getKey: (item: DeckMetaType) => item.lang,
		queryClient,
		enabled: !!userId,
		schema: DeckMetaSchema,
	})
export const cardsOptions = (userId: uuid) =>
	queryCollectionOptions({
		queryKey: ['user', userId, 'card'],
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
		enabled: !!userId,
		schema: CardMetaSchema,
	})
export const reviewDaysOptions = (userId: uuid) =>
	queryCollectionOptions({
		queryKey: ['user', userId, 'daily_review_state'],
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
		enabled: !!userId,
		schema: DailyReviewStateSchema,
	})
export const reviewsOptions = (userId: uuid) =>
	queryCollectionOptions({
		queryKey: ['user', userId, 'card_review'],
		queryFn: async () => {
			const { data } = await supabase
				.from('user_card_review')
				.select()
				.throwOnError()
			return data?.map((item) => CardReviewSchema.parse(item)) ?? []
		},
		getKey: (item: CardReviewType) => item.id,
		queryClient,
		enabled: !!userId,
		schema: CardReviewSchema,
	})

export const friendsOptions = (userId: uuid) =>
	queryCollectionOptions({
		queryKey: ['user', userId, 'friend_summary'],
		queryFn: async () => {
			const { data } = await supabase
				.from('friend_summary')
				.select()
				.throwOnError()
			return data?.map((item) => FriendSummarySchema.parse(item)) ?? []
		},
		getKey: (item: FriendSummaryType) =>
			`${item.uid_less}--${item.uid_more}`,
		queryClient,
		enabled: !!userId,
		schema: FriendSummarySchema,
	})
export const chatMessagesOptions = (userId: uuid) =>
	queryCollectionOptions({
		queryKey: ['user', userId, 'chat_message'],
		queryFn: async () => {
			const { data } = await supabase
				.from('chat_message')
				.select()
				.throwOnError()
			return data?.map((item) => ChatMessageSchema.parse(item)) ?? []
		},
		getKey: (item: ChatMessageType) => item.id,
		queryClient,
		enabled: !!userId,
		schema: ChatMessageSchema,
	})

export function initializeUserCollections(userId: uuid) {
	const profile = createCollection(profileOptions(userId))
	const decks = createCollection(decksOptions(userId))
	const cards = createCollection(cardsOptions(userId))
	const reviewDays = createCollection(reviewDaysOptions(userId))
	const reviews = createCollection(reviewsOptions(userId))
	const friends = createCollection(friendsOptions(userId))
	const chatMessages = createCollection(chatMessagesOptions(userId))

	const userCollections = {
		profile,
		decks,
		cards,
		reviewDays,
		reviews,
		friends,
		chatMessages,
	}

	return {
		userId,
		...userCollections,
		cleanupAll: async () => {
			await Promise.all(Object.values(userCollections).map((c) => c.cleanup()))
			void queryClient.removeQueries({ queryKey: ['user'] })
		},
		preloadAll: async () => {
			await Promise.all(Object.values(userCollections).map((c) => c.preload()))
		},
	}
}

export type UserCollections = ReturnType<typeof initializeUserCollections>
