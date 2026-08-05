import type { CardReviewType } from '@/features/review/schemas'
import { isScoringReview } from '@/features/review/review-utils'

/**
 * When a card was last practised, and the two FSRS values the scheduler reads.
 * `user_card_plus` still carries the same three as columns; until that view is
 * gone, both routes to them exist and must agree.
 */
export type CardScheduling = {
	last_reviewed_at: string | null
	difficulty: number | null
	stability: number | null
}

export const NO_SCHEDULING: CardScheduling = {
	last_reviewed_at: null,
	difficulty: null,
	stability: null,
}

/**
 * The latest scoring review wins. Stage-3 (again-round) rows carry null FSRS
 * values and would blank the card's scheduling, so they never count. Ordering
 * is by `created_at`, so a correction to an older row cannot jump the queue.
 *
 * Takes a missing list, not just an empty one: the include this reads is
 * produced by the query engine, and a row that arrives without it must not
 * take down the component that renders it. `useCardScheduling` reports the
 * shape when that happens.
 */
const isReviewList = (value: unknown): value is ReadonlyArray<CardReviewType> =>
	Array.isArray(value)

export function schedulingFromReviews(
	reviews: ReadonlyArray<CardReviewType> | null | undefined
): CardScheduling {
	if (!isReviewList(reviews)) return NO_SCHEDULING
	let latest: CardReviewType | null = null
	for (const review of reviews) {
		if (!isScoringReview(review)) continue
		if (latest === null || review.created_at > latest.created_at)
			latest = review
	}
	if (latest === null) return NO_SCHEDULING
	return {
		last_reviewed_at: latest.created_at,
		difficulty: latest.difficulty,
		stability: latest.stability,
	}
}
