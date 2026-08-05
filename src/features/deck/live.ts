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
 * A card with the reviews that decide its scheduler state.
 *
 * This is the cross-feature join named (#593): the card row owns the detail,
 * `user_card_review` owns the history, and the pairing has one place to live
 * instead of sitting inline in a hook. `schedulingFromReviews` in
 * `card-scheduling.ts` turns the reviews into the three values the UI reads.
 *
 * The subquery keeps only the scoring stages (1 and 2). Again-round rows carry
 * null FSRS values and never decide scheduling, so they are dropped here rather
 * than filtered by every consumer.
 *
 * A card is keyed by phrase and direction — the forward and reverse cards for
 * one phrase are separate rows with separate histories — so the correlation
 * matches on both.
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
