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
	LanguageMeta,
	PhrasesMap,
	pids,
} from '@/types/main'
import { mapArray } from '@/lib/utils'
import { useAuth } from '@/lib/hooks'
import { inLastWeek } from './dayjs'
import { useLanguage } from './use-language'
import { useMemo } from 'react'

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
		all: cardsArray?.map((c) => c.phrase_id!) ?? [],
		reviewed:
			cardsArray
				?.filter((c) => c.last_reviewed_at !== null)
				.map((c) => c.phrase_id!) ?? [],
		reviewed_last_7d:
			cardsArray
				?.filter(
					(c) => c.last_reviewed_at !== null && inLastWeek(c.last_reviewed_at)
				)
				?.map((c) => c.phrase_id!) ?? [],
		unreviewed:
			cardsArray
				?.filter((c) => c.last_reviewed_at === null)
				?.map((c) => c.phrase_id!) ?? [],
		today:
			(cardsArray ?? [])
				.filter(
					(c) =>
						c.last_reviewed_at !== null &&
						typeof c.retrievability_now === 'number' &&
						c.retrievability_now <= 0.9
				)
				?.map((c) => c.phrase_id!) ?? [],
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
const pendingDeckLang = {
	languageMeta: null,
	phrasesMap: null,
	deckMeta: null,
	cardsMap: null,
	pids: null,
	isPending: true,
}

type ProcessedPids = {
	language: pids
	deck: pids
	reviewed_last_7d: pids
	reviewed: pids
	due_today: pids
	unreviewed: pids
	not_in_deck: pids
	recommended_by_friends: pids
	recommended_easiest: pids
	recommended_newest: pids
	recommended_popular: pids
}

type ProcessedDeckLangData = {
	languageMeta: LanguageMeta
	phrasesMap: PhrasesMap
	deckMeta: DeckMeta
	cardsMap: CardsMap
	pids: ProcessedPids
	isPending: false
}

type PendingDeckLangData = typeof pendingDeckLang & { isPending: false }

export function useDeckLang(
	lang: string
): ProcessedDeckLangData | PendingDeckLangData {
	const {
		data: language,
		isPending: isPending1,
		error: error1,
	} = useLanguage(lang)
	const { data: deck, isPending: isPending2, error: error2 } = useDeck(lang)
	if (isPending1 || isPending2) return pendingDeckLang as PendingDeckLangData
	if (error1) throw error1
	if (error2) throw error2
	if (!language?.meta)
		throw new Error(
			"We can't find that language. Are you sure you have the correct URL?"
		)
	if (!language || !deck)
		throw Error(
			'Some error has occurred trying to fetch language, deck or profile'
		)

	return useMemo(() => {
		const not_in_deck = language.pids.filter(
			(pid) => deck.pids.all.indexOf(pid) === -1
		)
		return {
			languageMeta: language.meta,
			phrasesMap: language.phrasesMap,
			deckMeta: deck.meta,
			cardsMap: deck.cardsMap,
			pids: {
				language: language.pids,
				deck: deck.pids.all,
				reviewed_last_7d: deck.pids.reviewed_last_7d,
				reviewed: deck.pids.reviewed,
				due_today: deck.pids.today,
				unreviewed: deck.pids.unreviewed,
				not_in_deck,
				recommended_by_friends: [],
				recommended_easiest: not_in_deck.toSorted(
					(pid1, pid2) =>
						// prioritize LOWER values
						language.phrasesMap[pid1].avg_difficulty! -
						language.phrasesMap[pid2].avg_difficulty!
				),
				recommended_popular: not_in_deck.toSorted(
					(pid1, pid2) =>
						// prioritize HIGHER values
						language.phrasesMap[pid2].count_cards! -
						language.phrasesMap[pid1].count_cards!
				),
				recommended_newest: not_in_deck.toSorted((pid1, pid2) =>
					(
						language.phrasesMap[pid2].created_at! ===
						language.phrasesMap[pid1].created_at!
					) ?
						0
					: (
						// prioritize HIGHER values
						language.phrasesMap[pid2].created_at! >
						language.phrasesMap[pid1].created_at!
					) ?
						1
					:	-1
				),
			},
			isPending: false,
		}
	}, [language.pids, deck.pids, language.phrasesMap])
}
