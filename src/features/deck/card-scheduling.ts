import type { CardReviewType } from '@/features/review/schemas'
import { isScoringReview } from '@/features/review/review-utils'

/**
 * When a card was last practised, and the two FSRS values the scheduler reads.
 * Derived from the card's reviews and stored nowhere else — the `user_card`
 * row carries no scheduler state.
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

const isReviewList = (value: unknown): value is ReadonlyArray<CardReviewType> =>
	Array.isArray(value)

/**
 * The two values come from different rows, and mixing them up is the footgun
 * here.
 *
 * `last_reviewed_at` is the newest review of ANY phase. It answers "how long
 * since the user last saw this card and its answer", which is the elapsed time
 * FSRS decays against, so a phase-3 re-review counts.
 *
 * `difficulty` and `stability` come from the newest SCORING review (phase 1–2).
 * Phase-3 rows carry null FSRS values and would blank the card's state.
 *
 * Returns null when the review list is missing, which is not an empty history:
 * a `toArray` include is unpopulated on the frame its parent row enters the
 * query, so every card is emitted once with `reviews: null` — a card with a
 * full history included. A card with no reviews gets no later frame at all, so
 * a subscriber holds that null indefinitely. Null therefore means "not yet
 * known" and must never be read as "never practised".
 */
export function schedulingFromReviews(
	reviews: ReadonlyArray<CardReviewType> | null | undefined
): CardScheduling | null {
	if (!isReviewList(reviews)) return null
	let latestSighting: CardReviewType | null = null
	let latestScoring: CardReviewType | null = null
	for (const review of reviews) {
		if (
			latestSighting === null ||
			review.created_at > latestSighting.created_at
		)
			latestSighting = review
		if (!isScoringReview(review)) continue
		if (latestScoring === null || review.created_at > latestScoring.created_at)
			latestScoring = review
	}
	if (latestSighting === null) return NO_SCHEDULING
	return {
		last_reviewed_at: latestSighting.created_at,
		difficulty: latestScoring?.difficulty ?? null,
		stability: latestScoring?.stability ?? null,
	}
}
