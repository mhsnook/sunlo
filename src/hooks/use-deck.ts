import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

import type { uuid, ReviewsDayMap } from '@/types/main'
import { and, count, eq, gte, useLiveQuery } from '@tanstack/react-db'
import {
	cardsCollection,
	decksCollection,
	reviewDaysCollection,
} from '@/lib/collections'
import { useMemo } from 'react'
import { cardsFull } from '@/lib/live-collections'

dayjs.extend(isoWeek)

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

export const useDeckMeta = (lang: string) =>
	useLiveQuery((q) =>
		q
			.from({ deck: decksCollection })
			.where(({ deck }) => eq(deck.lang, lang))
			.findOne()
	)

// @@TODO recreate all of deckPids with either different hooks
// or another parameter for which PIDS you want and a different where clause
export const useDeckCards = (lang: string) =>
	useLiveQuery((q) =>
		q.from({ card: cardsFull }).where(({ card }) => eq(card.lang, lang))
	)

export const useDeckRoutineStats = (lang: string) => {
	const today = dayjs()
	const mostRecentMonday = today.isoWeekday(1).add(4, 'hour')
	const daysSoFar = today.diff(mostRecentMonday, 'day') + 1
	const mondayString = mostRecentMonday.format('YYYY-MM-DD')

	const query = useLiveQuery((q) =>
		q
			.from({ day: reviewDaysCollection })
			.where(({ day }) =>
				and(eq(day.lang, lang), gte(day.day_session, mondayString))
			)
			.select(({ day }) => ({ count: count(day.day_session) }))
			.findOne()
	)

	return useMemo(
		() => ({
			...query,
			data: query.data ? { daysMet: query.data.count, daysSoFar } : null,
		}),
		[query, daysSoFar]
	)
}

export const useDeckActivityChartData = (lang: string) =>
	useLiveQuery((q) =>
		q
			.from({ card: cardsCollection })
			.where(({ card }) => eq(card.lang, lang))
			.select(({ card }) => card.phrase_id)
	)

// export const useDeckCardsMap = (lang: string) =>

export const useDeckCard = (pid: uuid) =>
	useLiveQuery((q) =>
		q.from({ card: cardsFull }).where(({ card }) => eq(card.phrase_id, pid))
	)

export const useDeckPids = (lang: string) => {
	const query = useDeckCards(lang)

	return !query.data ? null : (
			{
				all: [],
				active: [],
				inactive: [],
				reviewed: [],
				reviewed_or_inactive: [],
				reviewed_last_7d: [],
				unreviewed_active: [],
				today_active: [],
			}
		)
}
