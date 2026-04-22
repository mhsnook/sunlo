import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { and, eq, gte, useLiveQuery } from '@tanstack/react-db'

import type { DeckMetaType } from '@/features/deck/schemas'
import { useDeckPids } from '@/features/deck/hooks'
import { useActiveReviewRemaining } from '@/features/review/hooks'
import {
	cardReviewsCollection,
	reviewDaysCollection,
} from '@/features/review/collections'
import { todayString } from '@/lib/utils'

export type DeckDue = { lang: string; due: number; total: number }
export type DueMap = Record<string, DeckDue>

/** Rolling 7-day window start, anchored to the 4am-cutoff day boundary. */
function useSevenDayStartDate() {
	return useMemo(
		() => dayjs().subtract(6, 'day').subtract(4, 'hour').format('YYYY-MM-DD'),
		[]
	)
}

/**
 * Recency-weighted review score per lang over the last 7 days.
 * Each review contributes 1 / (daysAgo + 1) — today=1, yesterday=½, …,
 * six days ago=⅐. Higher score = more active deck.
 */
export function useRecencyWeightedScores(): Record<string, number> {
	const startDate = useSevenDayStartDate()
	const today = todayString()

	const query = useLiveQuery(
		(q) =>
			q
				.from({ review: cardReviewsCollection })
				.where(({ review }) => gte(review.day_session, startDate)),
		[startDate]
	)

	return useMemo(() => {
		const scores: Record<string, number> = {}
		const todayMoment = dayjs(today)
		for (const r of query.data ?? []) {
			const daysAgo = Math.max(0, todayMoment.diff(dayjs(r.day_session), 'day'))
			const weight = 1 / (daysAgo + 1)
			scores[r.lang] = (scores[r.lang] ?? 0) + weight
		}
		return scores
	}, [query.data, today])
}

/** Number of unique days (in the last 7) the user studied a specific lang. */
export function useLangActiveDays(lang: string | undefined) {
	const startDate = useSevenDayStartDate()
	const query = useLiveQuery(
		(q) =>
			!lang
				? undefined
				: q
						.from({ day: reviewDaysCollection })
						.where(({ day }) =>
							and(eq(day.lang, lang), gte(day.day_session, startDate))
						),
		[lang, startDate]
	)
	return useMemo(() => {
		const set = new Set<string>()
		query.data?.forEach((d) => set.add(d.day_session))
		return set.size
	}, [query.data])
}

/**
 * Probes a single deck for due-card counts and reports them upward.
 * Lives as a child component so the per-lang hook calls stay stable
 * across renders even as the decks list changes.
 */
export function DeckDueProbe({
	deck,
	onReport,
}: {
	deck: DeckMetaType
	onReport: (entry: DeckDue) => void
}) {
	const { data: pids } = useDeckPids(deck.lang)
	const remaining = useActiveReviewRemaining(deck.lang, todayString())

	const due =
		remaining !== null
			? remaining
			: (pids?.today_active.length ?? 0) + (deck.daily_review_goal ?? 0)
	const total = pids?.all.length ?? 0

	useEffect(() => {
		onReport({ lang: deck.lang, due, total })
	}, [deck.lang, due, total, onReport])

	return null
}

/**
 * Shared ranking comparator: by recency-weighted review score desc,
 * tiebreak by raw due count desc, then lang asc for stability.
 */
export function compareDecks(
	a: DeckMetaType,
	b: DeckMetaType,
	scores: Record<string, number>,
	dueMap: DueMap
) {
	const scoreDiff = (scores[b.lang] ?? 0) - (scores[a.lang] ?? 0)
	if (scoreDiff !== 0) return scoreDiff
	const dueDiff = (dueMap[b.lang]?.due ?? 0) - (dueMap[a.lang]?.due ?? 0)
	if (dueDiff !== 0) return dueDiff
	return a.lang < b.lang ? -1 : 1
}

/**
 * Owns the due-map state for a set of decks and exposes the pieces
 * needed to render probes + derive rankings.
 */
export function useDueMap() {
	const [dueMap, setDueMap] = useState<DueMap>({})

	const report = useCallback((entry: DeckDue) => {
		setDueMap((prev) => {
			const existing = prev[entry.lang]
			if (
				existing &&
				existing.due === entry.due &&
				existing.total === entry.total
			) {
				return prev
			}
			return { ...prev, [entry.lang]: entry }
		})
	}, [])

	return { dueMap, report }
}
