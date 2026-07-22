import { useMemo } from 'react'
import { and, count, eq, gte, useLiveQuery } from '@tanstack/react-db'
import { should } from '@scenetest/checks/react'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

import type { pids, UseLiveQueryResult } from '@/types/main'
import type { CardMetaType, DeckMetaType } from './schemas'
import type { CardReviewType } from '@/features/review/schemas'
import { decksCollection, cardsCollection } from './collections'
import {
	cardReviewsCollection,
	reviewSessionsCollection,
} from '@/features/review/collections'
import { inLastWeek } from '@/lib/dayjs'
import { mapArrays, sortDecksByActivity } from '@/lib/utils'
import { useProfile } from '@/features/profile/hooks'
import { isDueCard } from './is-due-card'

dayjs.extend(isoWeek)

/** Deduplicate an array of IDs */
const unique = (ids: pids): pids => [...new Set(ids)]

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
	const statsByLang = useDeckCardStatsByLang()
	return {
		...query,
		data: query.data.toSorted((a, b) =>
			sortDecksByActivity(
				{
					lang: a.lang,
					created_at: a.created_at,
					most_recent_review_at:
						statsByLang[a.lang]?.most_recent_review_at ?? null,
				},
				{
					lang: b.lang,
					created_at: b.created_at,
					most_recent_review_at:
						statsByLang[b.lang]?.most_recent_review_at ?? null,
				}
			)
		),
	}
}

export type DeckCardStats = {
	cards_active: number
	cards_learned: number
	cards_skipped: number
	most_recent_review_at: string | null
}

const aggregateDeckCardStats = (
	cards: ReadonlyArray<CardMetaType>
): DeckCardStats => {
	const stats: DeckCardStats = {
		cards_active: 0,
		cards_learned: 0,
		cards_skipped: 0,
		most_recent_review_at: null,
	}
	for (const card of cards) {
		if (card.status === 'active') stats.cards_active++
		else if (card.status === 'learned') stats.cards_learned++
		else if (card.status === 'skipped') stats.cards_skipped++
		if (
			card.last_reviewed_at &&
			(stats.most_recent_review_at === null ||
				card.last_reviewed_at > stats.most_recent_review_at)
		)
			stats.most_recent_review_at = card.last_reviewed_at
	}
	return stats
}

export const useDeckCardStats = (lang: string): DeckCardStats => {
	const { data: cards } = useDeckCards(lang)
	return useMemo(() => aggregateDeckCardStats(cards ?? []), [cards])
}

export const useDeckCardStatsByLang = (): Record<string, DeckCardStats> => {
	const { data: cards } = useLiveQuery((q) => q.from({ card: cardsCollection }))
	return useMemo(() => {
		const byLang = new Map<string, Array<CardMetaType>>()
		for (const card of cards ?? []) {
			const arr = byLang.get(card.lang)
			if (arr) arr.push(card)
			else byLang.set(card.lang, [card])
		}
		const out: Record<string, DeckCardStats> = {}
		for (const [lang, langCards] of byLang)
			out[lang] = aggregateDeckCardStats(langCards)
		return out
	}, [cards])
}

export type DeckReviewCounts = {
	count_reviews_7d: number
	count_reviews_7d_positive: number
}

export const useDeckReviewCounts = (lang: string): DeckReviewCounts => {
	const { data: reviews } = useLiveQuery(
		(q) =>
			q
				.from({ review: cardReviewsCollection })
				.where(({ review }) => eq(review.lang, lang)),
		[lang]
	)
	return useMemo(() => {
		let count_reviews_7d = 0
		let count_reviews_7d_positive = 0
		for (const review of reviews ?? []) {
			if (inLastWeek(review.created_at)) {
				count_reviews_7d++
				if (review.score >= 2) count_reviews_7d_positive++
			}
		}
		return { count_reviews_7d, count_reviews_7d_positive }
	}, [reviews])
}

export type CardWithSibling = CardMetaType & { sibling_id: string | null }

export const useMyCard = (
	phraseId: string | null | undefined
): UseLiveQueryResult<CardWithSibling> => {
	const query = useLiveQuery(
		(q) =>
			!phraseId
				? undefined
				: q
						.from({ card: cardsCollection })
						.where(({ card }) => eq(card.phrase_id, phraseId))
						.orderBy(({ card }) => card.direction, 'asc'),
		[phraseId]
	)
	should(
		'forward/reverse cards share status',
		!query.data ||
			query.data.length <= 1 ||
			new Set(query.data.map((c) => c.status)).size === 1
	)
	const [card, sibling] = query.data ?? []
	return {
		...query,
		data: card ? { ...card, sibling_id: sibling?.id ?? null } : undefined,
	} as UseLiveQueryResult<CardWithSibling>
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
				.from({ day: reviewSessionsCollection })
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

type DeckPids = {
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
		data: !data
			? null
			: {
					all: unique(data.map((c) => c.phrase_id)),
					active: unique(
						data.filter((c) => c.status === 'active').map((c) => c.phrase_id)
					),
					inactive: unique(
						data.filter((c) => c.status !== 'active').map((c) => c.phrase_id)
					),
					reviewed: unique(
						data.filter((c) => !!c.last_reviewed_at).map((c) => c.phrase_id)
					),
					reviewed_or_inactive: unique(
						data
							.filter((c) => !!c.last_reviewed_at || c.status !== 'active')
							.map((c) => c.phrase_id)
					),
					reviewed_last_7d: unique(
						data
							.filter(
								(c) => c.last_reviewed_at && inLastWeek(c.last_reviewed_at)
							)
							.map((c) => c.phrase_id)
					),
					unreviewed_active: unique(
						data
							.filter((c) => c.status === 'active' && !c.last_reviewed_at)
							.map((c) => c.phrase_id)
					),
					today_active: unique(data.filter(isDueCard).map((c) => c.phrase_id)),
				},
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

/**
 * Returns the review answer mode for a deck.
 * Priority:
 * 1. Deck-specific review_answer_mode (if set)
 * 2. Profile's review_answer_mode
 * 3. Fallback to '2-buttons'
 */
export const useReviewAnswerMode = (
	lang: string
): '4-buttons' | '2-buttons' => {
	const { data: deck } = useDeckMeta(lang)
	const { data: profile } = useProfile()
	if (deck?.review_answer_mode) {
		return deck.review_answer_mode
	}
	return profile?.review_answer_mode ?? '2-buttons'
}
