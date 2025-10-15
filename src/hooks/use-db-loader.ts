import {
	cardReviewsCollection,
	cardsCollection,
	decksCollection,
	myProfileCollection,
	phrasesCollection,
	reviewDaysCollection,
} from '@/lib/collections'
import {
	CardMetaSchema,
	CardReviewSchema,
	DailyReviewStateSchema,
	DeckMetaSchema,
	MyProfileSchema,
	PhraseFullSchema,
	PhraseRequestSchema,
} from '@/lib/schemas'
import supabase from '@/lib/supabase-client'
import { uuid } from '@/types/main'
import { queryOptions } from '@tanstack/react-query'

export const baseLoaderQuery = (uid: uuid | null) =>
	queryOptions({
		queryKey: ['loader', 'me', uid],
		queryFn: async (): Promise<boolean | null> => {
			// null means pre-req uid not present
			if (!uid) return null as never
			const { data } = await supabase
				.from('user_profile')
				.select('*, user_deck_plus(*, user_deck_review_state(*))')
				.eq('uid', uid)
				.maybeSingle()
				.throwOnError()
			// false means data un-found
			if (!data) return false as never

			const { user_deck_plus, ...user_profile } = data

			user_deck_plus.forEach((i) => {
				decksCollection.insert(DeckMetaSchema.parse(i))
				if (i.user_deck_review_state)
					i.user_deck_review_state.forEach((j) =>
						reviewDaysCollection.insert(DailyReviewStateSchema.parse(j))
					)
			})

			myProfileCollection.insert(MyProfileSchema.parse(user_profile))

			return true
		},
		staleTime: Infinity,
		gcTime: Infinity,
	})

export const langLoaderQuery = (lang: string, uid: uuid | null) =>
	queryOptions({
		queryKey: ['loader', 'lang', lang, uid ?? 'anon'],
		queryFn: async (): Promise<boolean | null> => {
			// null means prerequisite un-met
			if (!lang) return null as never
			const { data } = await supabase
				.from('language_plus')
				.select(
					'*, meta_phrase_info(*, translations:phrase_translation(*)), requests:meta_phrase_request(*), user_deck_plus(*, user_card_review(*), user_card(*))'
				)
				.eq('lang', lang)
				.maybeSingle()
				.throwOnError()
			// false means data un-found
			if (!data) return false as never

			decksCollection.insert(DeckMetaSchema.parse(data))
			data.meta_phrase_info.forEach((i) => {
				phrasesCollection.insert(PhraseFullSchema.parse(i))
			})
			data.requests.forEach((i) => PhraseRequestSchema.parse(i))
			data.user_deck_plus.forEach((i) => {
				decksCollection.insert(DeckMetaSchema.parse(i))
				i.user_card.forEach((i) =>
					cardsCollection.insert(CardMetaSchema.parse(i))
				)
				i.user_card_review.forEach((i) =>
					cardReviewsCollection.insert(CardReviewSchema.parse(i))
				)
			})

			return true
		},
		staleTime: Infinity,
		gcTime: Infinity,
	})
