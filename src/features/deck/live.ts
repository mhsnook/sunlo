import { and, createLiveQueryCollection, eq, toArray } from '@tanstack/db'

import { cardsCollection } from './collections'
import { cardReviewsCollection } from '@/features/review/collections'

/**
 * A card with its whole review history — read it through
 * `schedulingFromReviews`, which splits the phases.
 *
 * Forward and reverse are separate cards with separate histories, so the
 * correlation matches direction as well as phrase.
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
							eq(review.direction, card.direction)
						)
					)
					.select(({ review }) => review)
			),
		})),
})
