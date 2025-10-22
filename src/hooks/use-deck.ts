import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

import type { uuid, ReviewsDayMap } from '@/types/main'
import { and, count, eq, gte, useLiveQuery } from '@tanstack/react-db'
import {
	cardReviewsCollection,
	decksCollection,
	reviewDaysCollection,
} from '@/lib/collections'
import { useMemo } from 'react'
import { cardsFull } from '@/lib/live-collections'
import { mapArrays } from '@/lib/utils'
import { inLastWeek } from '@/lib/dayjs'
import { themes } from '@/lib/deck-themes'

dayjs.extend(isoWeek)

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

export const useDeckActivityChartData = (lang: string) => {
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

	return useMemo(
		() => ({
			...query,
			data: calcActivityChartData(mapArrays(query.data, 'day_session')),
		}),
		[query]
	)
}

export const useDeckMeta = (lang: string) =>
	useLiveQuery(
		(q) =>
			q
				.from({ deck: decksCollection })
				.where(({ deck }) => eq(deck.lang, lang))
				.findOne(),
		[lang]
	)

export const useDecks = () => {
	const query = useLiveQuery((q) =>
		q
			.from({ deck: decksCollection })
			.orderBy(({ deck }) => deck.created_at, 'asc')
	)
	const decksWithThemes = useMemo(
		() =>
			!query.data ?
				[]
			:	query.data?.map((d, i) => ({
					...d,
					theme: i % themes.length,
				})),
		[query.data]
	)
	return useMemo(
		() => ({
			...query,
			data: decksWithThemes.toSorted((a, b) => {
				const aDate = a.most_recent_review_at ?? a.created_at
				const bDate = b.most_recent_review_at ?? b.created_at
				if (aDate > bDate) return -1
				if (aDate < bDate) return 1
				return a.lang > b.lang ? 1 : -1
			}),
		}),
		[decksWithThemes, query]
	)
}

export type UseOneDecksType = ReturnType<typeof useDecks>['data'][number]

export const useDeckCards = (lang: string) =>
	useLiveQuery(
		(q) => q.from({ card: cardsFull }).where(({ card }) => eq(card.lang, lang)),
		[lang]
	)

export const useDeckRoutineStats = (lang: string) => {
	const today = dayjs()
	const mostRecentMonday = today.isoWeekday(1).subtract(4, 'hour')
	const daysSoFar = today.diff(mostRecentMonday, 'day') + 1
	const mondayString = mostRecentMonday.format('YYYY-MM-DD')

	const query = useLiveQuery(
		(q) =>
			q
				.from({ day: reviewDaysCollection })
				.where(({ day }) =>
					and(eq(day.lang, lang), gte(day.day_session, mondayString))
				)
				.select(({ day }) => ({ count: count(day.day_session) }))
				.findOne(),
		[lang]
	)

	return useMemo(
		() => ({
			...query,
			data: query.data ? { daysMet: query.data.count, daysSoFar } : null,
		}),
		[query, daysSoFar]
	)
}

export const useDeckCard = (pid: uuid) =>
	useLiveQuery(
		(q) =>
			q.from({ card: cardsFull }).where(({ card }) => eq(card.phrase_id, pid)),
		[pid]
	)

export const useDeckPids = (lang: string) => {
	const { isLoading, data } = useDeckCards(lang)

	return useMemo(
		() => ({
			isLoading,
			data:
				!data ? null : (
					{
						all: data.map((c) => c.phrase_id),
						active: data.filter((c) => c.status === 'active'),
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
							.filter(
								(c) => c.last_reviewed_at && inLastWeek(c.last_reviewed_at)
							)
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
		}),
		[data, isLoading]
	)
}
