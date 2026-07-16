import { describe, it, expect } from 'vitest'
import { buildReviewsMap } from '@/features/review/review-utils'
import { toManifestEntry } from '@/features/review/manifest'
import type { CardReviewType } from '@/features/review/schemas'

/**
 * buildReviewsMap converts an array of reviews into a lookup keyed by
 * manifest entry ("phrase_id:direction").  This is the bridge between the
 * review table and the manifest: every manifest entry maps to at most one
 * review.  If this mapping is wrong — e.g. if it keyed by phrase_id alone —
 * then reviewing a forward card would shadow the reverse card's state, or
 * vice-versa.
 */

// Valid v4 UUIDs: position 14 = '4' (version), position 19 ∈ {8,9,a,b} (variant).
// zod@4's .uuid() rejects nil-ish '00000000-…-0001' strings.
const P1 = '11111111-1111-4111-8111-111111111111'
const P2 = '22222222-2222-4222-8222-222222222222'

function makeReview(
	overrides: Partial<CardReviewType> & {
		phrase_id: string
		direction: 'forward' | 'reverse'
	}
): CardReviewType {
	return {
		id: crypto.randomUUID(),
		created_at: '2025-06-01T12:00:00Z',
		uid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
		day_session: '2025-06-01',
		lang: 'hin',
		score: 3,
		stage: 1,
		difficulty: 5,
		review_time_retrievability: null,
		stability: 3,
		...overrides,
	}
}

describe('buildReviewsMap', () => {
	it('separates forward and reverse reviews for the same phrase', () => {
		// The same phrase reviewed in both directions should produce two
		// distinct entries, not one that overwrites the other.
		const forwardReview = makeReview({
			phrase_id: P1,
			direction: 'forward',
			score: 3,
		})
		const reverseReview = makeReview({
			phrase_id: P1,
			direction: 'reverse',
			score: 1,
		})

		const map = buildReviewsMap([forwardReview, reverseReview])

		const forwardKey = toManifestEntry(P1, 'forward')
		const reverseKey = toManifestEntry(P1, 'reverse')

		expect(Object.keys(map)).toHaveLength(2)
		expect(map[forwardKey]?.score).toBe(3)
		expect(map[reverseKey]?.score).toBe(1)
	})

	it('last review wins when multiple reviews exist for the same card', () => {
		// In a single session a card may be reviewed in the scoring pass (stage 1)
		// and again in the again-round (stage 3).  The array is ordered
		// chronologically (ASC), so the again-round review — which comes last — wins.
		const phase1 = makeReview({
			phrase_id: P1,
			direction: 'forward',
			score: 1,
			stage: 1,
			created_at: '2025-06-01T12:00:00Z',
		})
		const phase3 = makeReview({
			phrase_id: P1,
			direction: 'forward',
			score: 3,
			stage: 3,
			created_at: '2025-06-01T12:30:00Z',
		})

		const map = buildReviewsMap([phase1, phase3])

		const key = toManifestEntry(P1, 'forward')
		expect(map[key]?.score).toBe(3) // again-round score wins
		expect(map[key]?.stage).toBe(3) // again-round review
	})

	it('does not cross-contaminate between phrases or directions', () => {
		// Four distinct cards: P1 forward, P1 reverse, P2 forward, P2 reverse
		const reviews = [
			makeReview({ phrase_id: P1, direction: 'forward', score: 1 }),
			makeReview({ phrase_id: P1, direction: 'reverse', score: 2 }),
			makeReview({ phrase_id: P2, direction: 'forward', score: 3 }),
			makeReview({ phrase_id: P2, direction: 'reverse', score: 4 }),
		]

		const map = buildReviewsMap(reviews)

		expect(Object.keys(map)).toHaveLength(4)
		expect(map[toManifestEntry(P1, 'forward')]?.score).toBe(1)
		expect(map[toManifestEntry(P1, 'reverse')]?.score).toBe(2)
		expect(map[toManifestEntry(P2, 'forward')]?.score).toBe(3)
		expect(map[toManifestEntry(P2, 'reverse')]?.score).toBe(4)
	})

	it('returns an empty map for no reviews', () => {
		const map = buildReviewsMap([])
		expect(Object.keys(map)).toHaveLength(0)
	})
})
