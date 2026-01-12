import { and, count, eq, gte, useLiveQuery } from '@tanstack/react-db'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

import type { pids, UseLiveQueryResult } from '@/types/main'
import type { CardMetaType, CardReviewType, DeckMetaType } from '@/lib/schemas'
import {
	cardReviewsCollection,
	cardsCollection,
	decksCollection,
	reviewDaysCollection,
} from '@/lib/collections'
import { inLastWeek } from '@/lib/dayjs'
import { mapArrays, sortDecksByActivity } from '@/lib/utils'
import { useProfile } from './use-profile'

dayjs.extend(isoWeek)

type ReviewsDayMap = { [key: string]: Array<CardReviewType> }

const calcActivityChartData = (reviewsDayMap: ReviewsDayMap) => {
	if (!reviewsDayMap) return []
	const today = dayjs()
	// We generate 11 days of data: 9 past days, today, and one day in the future.
	// The future day acts as a buffer to prevent the last data point from being clipped.
	const data = Array.from({ length: 11 }).map((_, i) => {
		const date = today.subtract(9 - i, 'day').subtract(4, 'hour')
		const dayKey = date.format('YYYY-MM-DD')
		const reviewsForDay = reviewsDayMap[dayKey] ?? []
		const positiveReviews = reviewsForDay.filter((r) => r.score >= 2).length
		return {
			day: date.format('DD/MM'),
			total: reviewsForDay.length,
			positive: positiveReviews,
		}
	})
	return data
}

export const useDeckActivityChartData = (
	lang: string
): UseLiveQueryResult<ReturnType<typeof calcActivityChartData>> => {
	const startDate = dayjs()
		.subtract(9, 'day')
		.subtract(4, 'hour') // makes 4am the end of the day
		.format('YYYY-MM-DD')

	const query = useLiveQuery(
		(q) =>
			q
				.from({ review: cardReviewsCollection })
				.where(({ review }) =>
					and(eq(review.lang, lang), gte(review.day_session, startDate))
				),
		[lang, startDate]
	)

	return {
		...query,
		data: calcActivityChartData(mapArrays(query.data, 'day_session')),
	}
}

export const useDeckMeta = (lang: string): UseLiveQueryResult<DeckMetaType> =>
	useLiveQuery(
		(q) =>
			q
				.from({ deck: decksCollection })
				.where(({ deck }) => eq(deck.lang, lang))
				.findOne(),
		[lang]
	)

export const useDecks = (): UseLiveQueryResult<DeckMetaType[]> => {
	const query = useLiveQuery((q) => q.from({ deck: decksCollection }))
	return {
		...query,
		data: query.data.toSorted(sortDecksByActivity),
	}
}

export const useDeckCards = (
	lang: string
): UseLiveQueryResult<CardMetaType[]> =>
	useLiveQuery(
		(q) =>
			q
				.from({ card: cardsCollection })
				.where(({ card }) => eq(card.lang, lang)),
		[lang]
	)

export const useDeckRoutineStats = (lang: string) => {
	const today = dayjs()
	const mostRecentMonday = today.isoWeekday(1).subtract(4, 'hour')
	const daysSoFar = today.diff(mostRecentMonday, 'day') + 1
	const mondayString = mostRecentMonday.format('YYYY-MM-DD')

	const query: UseLiveQueryResult<{ count: number }> = useLiveQuery(
		(q) =>
			q
				.from({ day: reviewDaysCollection })
				.where(({ day }) =>
					and(eq(day.lang, lang), gte(day.day_session, mondayString))
				)
				.select(({ day }) => ({ count: count(day.day_session) }))
				.findOne(),
		[lang, mondayString]
	)

	return {
		...query,
		data: query.data ? { daysMet: query.data.count, daysSoFar } : null,
	}
}

export type DeckPids = {
	all: pids
	active: pids
	inactive: pids
	reviewed: pids
	reviewed_or_inactive: pids
	reviewed_last_7d: pids
	unreviewed_active: pids
	today_active: pids
}
type UseDeckPidsReturnType = {
	isLoading: boolean
	data: DeckPids | null
}

export const useDeckPids = (lang: string): UseDeckPidsReturnType => {
	const { isLoading, data } = useDeckCards(lang)

	return {
		isLoading: isLoading ?? true,
		data:
			!data ? null : (
				{
					all: data.map((c) => c.phrase_id),
					active: data
						.filter((c) => c.status === 'active')
						.map((c) => c.phrase_id),
					inactive: data
						.filter((c) => c.status !== 'active')
						.map((c) => c.phrase_id),
					reviewed: data
						.filter((c) => !!c.last_reviewed_at)
						.map((c) => c.phrase_id),
					reviewed_or_inactive: data
						.filter((c) => !!c.last_reviewed_at || c.status !== 'active')
						.map((c) => c.phrase_id),
					reviewed_last_7d: data
						.filter((c) => c.last_reviewed_at && inLastWeek(c.last_reviewed_at))
						.map((c) => c.phrase_id),
					unreviewed_active: data
						.filter((c) => c.status === 'active' && !c.last_reviewed_at)
						.map((c) => c.phrase_id),
					today_active: data
						.filter(
							(c) =>
								!!c.retrievability_now &&
								c.retrievability_now <= 0.9 &&
								c.status === 'active'
						)
						.map((c) => c.phrase_id),
				}
			),
	}
}

/**
 * Returns the preferred translation language for a deck.
 * Priority:
 * 1. Deck-specific preferred_translation_lang (if set)
 * 2. Profile's first known language
 * 3. Fallback to 'eng'
 */
export const usePreferredTranslationLang = (lang: string): string => {
	const { data: deck } = useDeckMeta(lang)
	const { data: profile } = useProfile()
	// Deck-specific preference takes priority
	if (deck?.preferred_translation_lang) {
		return deck.preferred_translation_lang
	}
	// Global default from profile
	return profile?.languages_known[0]?.lang ?? 'eng'
}
