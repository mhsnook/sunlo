import supabase from '@/lib/supabase-client'
import {
	type UseQueryResult,
	queryOptions,
	useQuery,
	useSuspenseQuery,
} from '@tanstack/react-query'

import type {
	CardsMap,
	DeckFetched,
	DeckMeta,
	DeckLoaded,
	CardFull,
	uuid,
	DeckPids,
} from '@/types/main'
import { mapArray } from '@/lib/utils'
import { useAuth } from '@/lib/hooks'
import { inLastWeek } from './dayjs'

const qs = {
	card_full: `*, reviews:user_card_review(*)` as const,
	deck_full: () => `*, cards:user_card_plus(${qs.card_full})` as const,
}

async function fetchDeck(lang: string, uid: uuid): Promise<DeckLoaded> {
	const { data } = await supabase
		.from('user_deck_plus')
		.select(qs.deck_full())
		.eq('lang', lang)
		.eq('uid', uid)
		.maybeSingle()
		.throwOnError()
	if (!data)
		throw Error(
			`This deck was not found in your profile. Perhaps it's just a bad URL? Please double check the language code in your URL; it should be 3 characters long, like "eng" or "hin". ${lang.length > 3 ? `Maybe you meant "${lang.substring(0, 3)}"?` : ''}`
		)
	const { cards: cardsArray, ...meta }: DeckFetched = data
	const pids: DeckPids = {
		all: cardsArray.map((c) => c.phrase_id!),
		active: cardsArray
			.filter((c) => c.status === 'active')
			.map((c) => c.phrase_id!),
		reviewed: cardsArray
			.filter((c) => c.last_reviewed_at !== null)
			.map((c) => c.phrase_id!),
		reviewed_or_inactive: cardsArray
			.filter(
				(c) =>
					c.last_reviewed_at !== null ||
					c.status === 'skipped' ||
					c.status === 'learned'
			)
			.map((c) => c.phrase_id!),
		reviewed_last_7d: cardsArray
			.filter(
				(c) => c.last_reviewed_at !== null && inLastWeek(c.last_reviewed_at)
			)
			.map((c) => c.phrase_id!),
		unreviewed_active: cardsArray
			.filter((c) => c.last_reviewed_at === null && c.status === 'active')
			.map((c) => c.phrase_id!),
		today_active: cardsArray
			.filter(
				(c) =>
					c.last_reviewed_at !== null &&
					typeof c.retrievability_now === 'number' &&
					c.retrievability_now <= 0.9 &&
					c.status === 'active'
			)
			.map((c) => c.phrase_id!),
	}
	const cardsMap: CardsMap = mapArray(cardsArray, 'phrase_id')
	return {
		meta,
		pids,
		cardsMap,
	}
}

export const deckQueryOptions = (lang: string, userId: uuid | null) =>
	queryOptions({
		queryKey: ['user', lang, 'deck'],
		queryFn: async ({ queryKey }) => fetchDeck(queryKey[1], userId!),
		enabled: !!userId && !!lang,
	})
export const useDeck = (lang: string) => {
	const { userId } = useAuth()
	return useQuery({
		...deckQueryOptions(lang, userId),
	}) as UseQueryResult<DeckLoaded>
}

export const useDeckMeta = (lang: string) => {
	const { userId } = useAuth()
	return useSuspenseQuery({
		...deckQueryOptions(lang, userId),
		select: (data: DeckLoaded) => data.meta,
	}) as UseQueryResult<DeckMeta>
}

// @TODO replace this with a memoized select on data.cards
export const useDeckPids = (lang: string) => {
	const { userId } = useAuth()
	return useQuery({
		...deckQueryOptions(lang, userId),
		select: (data: DeckLoaded) => data.pids,
	}) as UseQueryResult<DeckPids>
}

export const useDeckCardsMap = (lang: string) => {
	const { userId } = useAuth()
	return useQuery({
		...deckQueryOptions(lang, userId),
		select: (data: DeckLoaded) => data.cardsMap,
	}) as UseQueryResult<CardsMap>
}

export const useDeckCard = (pid: uuid, lang: string) => {
	const { userId } = useAuth()
	return useQuery({
		...deckQueryOptions(lang, userId),
		select: (data: DeckLoaded) => data.cardsMap[pid],
	}) as UseQueryResult<CardFull>
}
