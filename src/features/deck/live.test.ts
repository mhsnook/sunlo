import { describe, it, expect } from 'vitest'
import {
	and,
	createCollection,
	createLiveQueryCollection,
	eq,
	inArray,
	localOnlyCollectionOptions,
	toArray,
} from '@tanstack/db'

/**
 * `cardsWithReviews` builds its `reviews` field with a `toArray` include, and
 * the query engine does not populate that include on the frame a parent row
 * enters the query. Every card therefore appears once with `reviews: null`
 * before its real list arrives — a card with a full history included. A card
 * with no reviews gets no correcting frame, so a subscriber keeps the null
 * even though the collection's own copy of the row holds an empty array.
 *
 * `schedulingFromReviews` reads that null as pending because of this. These
 * tests stand in for `cardsCollection` and `cardReviewsCollection` with local
 * collections, so they pin the engine's contract rather than our wiring: if a
 * future @tanstack/db seeds the include on entry, they fail and the pending
 * branch can go.
 */

type Card = { id: string; phrase_id: string; direction: string }
type Review = {
	id: string
	phrase_id: string
	direction: string
	stage: number
	created_at: string
}

const makeCards = (id: string, initialData: Array<Card>) =>
	createCollection(
		localOnlyCollectionOptions<Card>({
			id,
			getKey: (c) => c.id,
			initialData,
		})
	)

const makeReviews = (id: string, initialData: Array<Review>) =>
	createCollection(
		localOnlyCollectionOptions<Review>({
			id,
			getKey: (r) => r.id,
			initialData,
		})
	)

const buildQuery = (
	cards: ReturnType<typeof makeCards>,
	reviews: ReturnType<typeof makeReviews>,
	id: string
) =>
	createLiveQueryCollection({
		id,
		query: (q) =>
			q.from({ card: cards }).select(({ card }) => ({
				...card,
				reviews: toArray(
					q
						.from({ review: reviews })
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

const scoringReview = (phrase_id: string, id: string): Review => ({
	id,
	phrase_id,
	direction: 'forward',
	stage: 1,
	created_at: '2026-08-01T10:00:00Z',
})

describe('toArray includes on cards already present at query start', () => {
	it('gives a card with no reviews an empty array, not null', async () => {
		const cards = makeCards('cards-a', [
			{ id: 'c1', phrase_id: 'p1', direction: 'forward' },
		])
		const reviews = makeReviews('reviews-a', [])
		const query = buildQuery(cards, reviews, 'q-a')
		await query.preload()

		expect(query.toArray[0]?.reviews).toEqual([])
	})
})

describe('toArray includes on cards entering a live query', () => {
	const collectFrames = (
		query: ReturnType<typeof buildQuery>,
		key: string
	): { frames: Array<unknown>; stop: () => void } => {
		const frames: Array<unknown> = []
		const subscription = query.subscribeChanges((changes) => {
			for (const change of changes)
				if (change.key === key) frames.push(change.value?.reviews)
		})
		return { frames, stop: () => subscription.unsubscribe() }
	}

	it('emits null first for a card whose reviews already exist', async () => {
		const cards = makeCards('cards-b', [])
		const reviews = makeReviews('reviews-b', [scoringReview('p1', 'r1')])
		const query = buildQuery(cards, reviews, 'q-b')
		await query.preload()
		const { frames, stop } = collectFrames(query, 'c1')

		cards.insert({ id: 'c1', phrase_id: 'p1', direction: 'forward' })
		await new Promise((resolve) => setTimeout(resolve, 50))
		stop()

		expect(frames[0]).toBeNull()
		expect(frames.at(-1)).toHaveLength(1)
	})

	it('never corrects the null for a card that has no reviews', async () => {
		const cards = makeCards('cards-c', [])
		const reviews = makeReviews('reviews-c', [])
		const query = buildQuery(cards, reviews, 'q-c')
		await query.preload()
		const { frames, stop } = collectFrames(query, 'c1')

		cards.insert({ id: 'c1', phrase_id: 'p1', direction: 'forward' })
		await new Promise((resolve) => setTimeout(resolve, 50))
		stop()

		// No second frame, so a subscriber holds the null for as long as the card
		// has no reviews. This is why the pending branch cannot be a one-frame
		// tolerance — `useCardScheduling` can return null indefinitely.
		expect(frames).toEqual([null])
		// The collection's own copy is the empty array the subscriber never got.
		expect(query.get('c1')?.reviews).toEqual([])
	})
})
