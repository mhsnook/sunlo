import type { CardReviewType } from '@/features/review/schemas'
import { isScoringReview } from '@/features/review/review-utils'

/**
 * The scheduler state a card carries: when it was last practised, and the two
 * FSRS values the scheduler reads. Today these are columns on `user_card_plus`,
 * welded onto the card row by the view. They are derived data — the detail
 * lives on `user_card_review` — so this module computes them from the reviews.
 *
 * Splitting the derivation out of the live query keeps it testable: the query
 * in `live.ts` produces a card and its reviews, and this decides what they mean.
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
 * The latest scoring review decides a card's scheduler state.
 *
 * Only stages 1 and 2 score. An again-round row (stage 3) records that the user
 * tapped "again", and carries null FSRS values that would blank the card's
 * scheduling if it won. Ordering is by `created_at`, so a correction that
 * rewrites an older row does not jump the queue.
 */
export function schedulingFromReviews(
	reviews: ReadonlyArray<CardReviewType>
): CardScheduling {
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
