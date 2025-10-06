import { useMemo } from 'react'
import supabase from '@/lib/supabase-client'
import { queryOptions, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

import type {
	CardFull,
	DeckMeta,
	DeckFetched,
	uuid,
	DeckPids,
	ReviewsDayMap,
} from '@/types/main'
import { arrayDifference, mapArray, mapArrays } from '@/lib/utils'
import { useAuth } from '@/lib/hooks'
import { inLastWeek } from '@/lib/dayjs'

dayjs.extend(isoWeek)

const calcRoutineStats = (
	reviewsDayMap: ReviewsDayMap | null,
	goal: number
) => {
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

const calcActivityChartData = (reviewsDayMap: ReviewsDayMap | null) => {
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

async function fetchDeck(lang: string, uid: uuid): Promise<DeckFetched | null> {
	const { data } = await supabase
		.from('user_deck_plus')
		.select(`*, cards:user_card_plus(*, reviews:user_card_review(*))`)
		.eq('lang', lang)
		.eq('uid', uid)
		.maybeSingle()
		.throwOnError()
	if (!data)
		// throw Error(
		// 	`This deck was not found in your profile. Perhaps it's just a bad URL? Please double check the language code in your URL; it should be 3 characters long, like "eng" or "hin". ${lang.length > 3 ? `Maybe you meant "${lang.substring(0, 3)}"?` : ''}`
		// )
		// returning null instead of throwing, so that we can show a nicer message in the UI
		return null
	return data
}

export const deckQueryOptions = (lang: string, userId: uuid | null) =>
	queryOptions({
		queryKey: ['user', lang, 'deck'] as const,
		queryFn: async () => fetchDeck(lang, userId!),
		enabled: !!userId && !!lang,
	})

const selectPids = (data: DeckFetched | null): DeckPids | null => {
	if (!data) return null
	const cardsArray = data.cards
	const all = cardsArray.map((c) => c.phrase_id!)
	const active = cardsArray
		.filter((c) => c.status === 'active')
		.map((c) => c.phrase_id!)
	const today_active = cardsArray
		.filter(
			(c) =>
				c.last_reviewed_at !== null &&
				typeof c.retrievability_now === 'number' &&
				c.retrievability_now <= 0.9 &&
				c.status === 'active'
		)
		.map((c) => c.phrase_id!)
	return {
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
		today_active,
	}
}

const selectDeckMeta = (data: DeckFetched | null): DeckMeta | null => {
	if (!data) return null
	const { cards: _, ...meta } = data
	const pids = selectPids(data)
	return { ...meta, cardsScheduledForToday: pids?.today_active.length ?? 0 }
}

export const useDeckMeta = (lang: string) => {
	const { userId } = useAuth()
	const options = deckQueryOptions(lang, userId)
	const { data, ...rest } = useSuspenseQuery({
		...options,
		select: selectDeckMeta,
	})
	if (!data)
		throw new Error(
			`This deck was not found in your profile. Perhaps it's just a bad URL? Please double check the language code in your URL; it should be 3 characters long, like "eng" or "hin". ${lang.length > 3 ? `Maybe you meant "${lang.substring(0, 3)}"?` : ''}`
		)
	return { data, ...rest }
}

export const useDeckPids = (lang: string) => {
	const { userId } = useAuth()
	const options = deckQueryOptions(lang, userId)
	return useQuery({
		...options,
		select: selectPids,
	})
}

const selectReviewsDayMap = (data: DeckFetched | null) => {
	if (!data) return null
	const reviews = data.cards.flatMap((c) => c.reviews)
	return mapArrays(reviews, 'day_session')
}

const selectRoutineStats = (data: DeckFetched | null) => {
	if (!data) return { daysMet: 0, daysSoFar: 1 }
	const reviewsDayMap = selectReviewsDayMap(data)
	return calcRoutineStats(reviewsDayMap, data.daily_review_goal ?? 15)
}
export const useDeckRoutineStats = (lang: string) => {
	const { userId } = useAuth()
	const options = deckQueryOptions(lang, userId)
	return useQuery({
		...options,
		select: selectRoutineStats,
	})
}

const selectActivityChartData = (data: DeckFetched | null) => {
	if (!data) return []
	const reviewsDayMap = selectReviewsDayMap(data)
	return calcActivityChartData(reviewsDayMap)
}
export const useDeckActivityChartData = (lang: string) => {
	const { userId } = useAuth()
	const options = deckQueryOptions(lang, userId)
	return useQuery({
		...options,
		select: selectActivityChartData,
	})
}

const selectCardsMap = (data: DeckFetched | null) => {
	if (!data) return null
	return mapArray<CardFull, 'phrase_id'>(data.cards, 'phrase_id')
}

export const useDeckCardsMap = (lang: string) => {
	const { userId } = useAuth()
	const options = deckQueryOptions(lang, userId)
	return useQuery({
		...options,
		select: selectCardsMap,
	})
}

export const useDeckCard = (pid: uuid, lang: string) => {
	const { userId } = useAuth()
	const selectCard = useMemo(() => {
		return (data: DeckFetched | null) => {
			if (!data) return undefined
			return data.cards.find((c) => c.phrase_id === pid)
		}
	}, [pid])
	return useQuery({
		...deckQueryOptions(lang, userId),
		select: selectCard,
	})
}
