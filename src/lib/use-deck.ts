import supabase from '@/lib/supabase-client'
import {
	type UseQueryResult,
	queryOptions,
	useQuery,
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

const qs = {
	card_full: `*, reviews:user_card_review(*)` as const,
	deck_full: () => `*, cards:user_card_plus(${qs.card_full})` as const,
}

async function fetchDeck(lang: string): Promise<DeckLoaded> {
	const { data } = await supabase
		.from('user_deck_plus')
		.select(qs.deck_full())
		.eq('lang', lang)
		.maybeSingle()
		.throwOnError()
	if (!data)
		throw Error(
			`This deck was not found in your profile. Perhaps it's just a bad URL? Please double check the language code in your URL; it should be 3 characters long, like "eng" or "hin". ${lang.length > 3 ? `Maybe you meant "${lang.substring(0, 3)}"?` : ''}`
		)
	const { cards: cardsArray, ...meta }: DeckFetched = data
	const pids: DeckPids = {
		all: cardsArray?.map((c) => c.phrase_id!),
		reviewed: cardsArray
			?.filter((c) => c.last_reviewed_at !== null)
			.map((c) => c.phrase_id!),
		unreviewed: cardsArray
			?.filter((c) => c.last_reviewed_at === null)
			.map((c) => c.phrase_id!),
		today: (cardsArray ?? [])
			.filter(
				(c) =>
					c.last_reviewed_at !== null &&
					typeof c.retrievability_now === 'number' &&
					c.retrievability_now <= 0.9
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
		queryKey: ['user', lang],
		queryFn: async ({ queryKey }) => fetchDeck(queryKey[1]),
		enabled: !!userId && !!lang,
		gcTime: 1_200_000,
		staleTime: 120_000,
		refetchOnWindowFocus: false,
	})
export const useDeck = (lang: string) => {
	const { userId } = useAuth()
	return useQuery({
		...deckQueryOptions(lang, userId),
	}) as UseQueryResult<DeckLoaded>
}

export const useDeckMeta = (lang: string) => {
	const { userId } = useAuth()
	return useQuery({
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
