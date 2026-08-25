import {
	and,
	createLiveQueryCollection,
	eq,
	inArray,
	toArray,
} from '@tanstack/db'

import { cardsCollection } from './collections'
import { cardReviewsCollection } from '@/features/review/collections'

/**
 * A card with the reviews that decide its scheduler state — read it through
 * `schedulingFromReviews`. Forward and reverse are separate cards with separate
 * histories, so the correlation matches direction as well as phrase, and only
 * the scoring stages come through (see `card-scheduling.ts`).
 */
export const cardsWithReviews = createLiveQueryCollection({
	id: 'cards_with_reviews',
	query: (q) =>
		q.from({ card: cardsCollection }).select(({ card }) => ({
			...card,
			reviews: toArray(
				q
					.from({ review: cardReviewsCollection })
					.where(({ review }) =>
						and(
							eq(review.phrase_id, card.phrase_id),
							eq(review.direction, card.direction),
							inArray(review.stage, [1, 2])
						)
					)
					.select(({ review }) => review)
			),
		})),
})
