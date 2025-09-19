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
	ReviewsDayMap,
	RoutineStats,
	ActivityChartData,
} from '@/types/main'
import { arrayDifference, mapArray, mapArrays } from '@/lib/utils'
import { useAuth } from '@/lib/hooks'
import { inLastWeek } from './dayjs'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

const calcRoutineStats = (reviewsDayMap: ReviewsDayMap, goal: number) => {
	if (!reviewsDayMap) return { daysMet: 0, daysSoFar: 1 }

	const today = dayjs()
	const mostRecentMonday = today.isoWeekday(1)
	const daysSoFar = today.diff(mostRecentMonday, 'day') + 1

	let daysMet = 0
	for (let i = 0; i < daysSoFar; i++) {
		const dayToCheck = mostRecentMonday.add(i, 'day')
		const dayKey = dayToCheck.format('YYYY-MM-DD')
		const reviewsForDay = reviewsDayMap[dayKey] || []
		if (reviewsForDay.length >= goal) {
			daysMet++
		}
	}
	return { daysMet, daysSoFar }
}

const calcActivityChartData = (reviewsDayMap: ReviewsDayMap) => {
	if (!reviewsDayMap) return []
	const today = dayjs()
	// We generate 11 days of data: 9 past days, today, and one day in the future.
	// The future day acts as a buffer to prevent the last data point from being clipped.
	const data = Array.from({ length: 11 }).map((_, i) => {
		const date = today.subtract(9 - i, 'day')
		const dayKey = date.format('YYYY-MM-DD')
		const reviewsForDay = reviewsDayMap[dayKey] || []
		const positiveReviews = reviewsForDay.filter((r) => r.score >= 2).length
		return {
			day: date.format('DD/MM'),
			total: reviewsForDay.length,
			positive: positiveReviews,
		}
	})
	return data
}

async function fetchDeck(lang: string, uid: uuid): Promise<DeckLoaded> {
	const { data } = await supabase
		.from('user_deck_plus')
		.select(`*, cards:user_card_plus(*, reviews:user_card_review(*))`)
		.eq('lang', lang)
		.eq('uid', uid)
		.maybeSingle()
		.throwOnError()
	if (!data)
		throw Error(
			`This deck was not found in your profile. Perhaps it's just a bad URL? Please double check the language code in your URL; it should be 3 characters long, like "eng" or "hin". ${lang.length > 3 ? `Maybe you meant "${lang.substring(0, 3)}"?` : ''}`
		)
	const { cards: cardsArray, ...meta }: DeckFetched = data
	const reviews = cardsArray.flatMap((c) => c.reviews)
	const reviewsDayMap = mapArrays(reviews, 'day_session')

	const all = cardsArray.map((c) => c.phrase_id!)
	const active = cardsArray
		.filter((c) => c.status === 'active')
		.map((c) => c.phrase_id!)

	const pids: DeckPids = {
		all,
		active,
		inactive: arrayDifference(all, [active]),
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
		reviews,
		reviewsDayMap,
	}
}

export const deckQueryOptions = (lang: string, userId: uuid | null) =>
	queryOptions({
		queryKey: ['user', lang, 'deck'],
		queryFn: async ({ queryKey }) => fetchDeck(queryKey[1], userId!),
		enabled: !!userId && !!lang,
	})

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

export const useDeckRoutineStats = (lang: string) => {
	const { userId } = useAuth()
	return useQuery({
		...deckQueryOptions(lang, userId),
		select: (data: DeckLoaded) => {
			return calcRoutineStats(
				data.reviewsDayMap,
				data.meta.daily_review_goal ?? 15
			)
		},
	}) as UseQueryResult<RoutineStats>
}

export const useDeckActivityChartData = (lang: string) => {
	const { userId } = useAuth()
	return useQuery({
		...deckQueryOptions(lang, userId),
		select: (data: DeckLoaded) => {
			return calcActivityChartData(data.reviewsDayMap)
		},
	}) as UseQueryResult<ActivityChartData>
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
		enabled: !!userId,
	}) as UseQueryResult<CardFull>
}
