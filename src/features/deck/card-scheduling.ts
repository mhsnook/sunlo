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
 * Returns null when the review list is missing, which is not an empty history:
 * the query engine emits a card the frame it enters the query with its
 * `reviews` include set to null, and a card with a full history passes through
 * that same null frame before its list arrives. A card with no reviews gets no
 * correcting frame at all, so a caller can hold the null indefinitely. Either
 * way, null must never be read as "never practised" — see `live.test.ts`.
 */
const isReviewList = (value: unknown): value is ReadonlyArray<CardReviewType> =>
	Array.isArray(value)

export function schedulingFromReviews(
	reviews: ReadonlyArray<CardReviewType> | null | undefined
): CardScheduling | null {
	if (!isReviewList(reviews)) return null
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
