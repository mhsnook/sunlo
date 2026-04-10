import { describe, it, expect } from 'vitest'
import {
	getIndexOfNextUnreviewedCard,
	getIndexOfNextAgainCard,
	type ReviewsMap,
} from '@/features/review/review-utils'
import type { CardReviewType } from '@/features/review/schemas'
import type { ManifestEntry } from '@/features/review/manifest'

/**
 * These tests verify the session-navigation functions with manifests that
 * contain both forward and reverse entries for the same phrase — the core
 * scenario introduced by bidirectional cards.
 *
 * The manifest is an ordered list of strings like "uuid:forward" and
 * "uuid:reverse".  ReviewsMap is keyed by those same strings.
 * If these two don't agree on format, the navigation functions silently
 * treat reviewed cards as unreviewed (or vice-versa).
 */

const P1 = '00000000-0000-0000-0000-000000000001'
const P2 = '00000000-0000-0000-0000-000000000002'
const P3 = '00000000-0000-0000-0000-000000000003'

/** Minimal CardReviewType stub — only score matters for these tests */
function stubReview(score: number): CardReviewType {
	return {
		id: crypto.randomUUID(),
		created_at: '2025-06-01T12:00:00Z',
		uid: '00000000-0000-0000-0000-aaaaaaaaaaaa',
		day_session: '2025-06-01',
		lang: 'hin',
		phrase_id: P1,
		direction: 'forward',
		score,
		day_first_review: true,
		difficulty: 5,
		review_time_retrievability: null,
		stability: 3,
		updated_at: null,
	}
}

describe('getIndexOfNextUnreviewedCard', () => {
	it('skips reviewed forward card, finds unreviewed reverse card for the SAME phrase', () => {
		// Manifest: [P1:forward, P1:reverse]
		// Only P1:forward has been reviewed.
		// Expected: P1:reverse (index 1) is the next unreviewed card.
		const manifest: Array<ManifestEntry> = [`${P1}:forward`, `${P1}:reverse`]
		const reviewsMap: ReviewsMap = {
			[`${P1}:forward`]: stubReview(3),
		}

		const next = getIndexOfNextUnreviewedCard(manifest, reviewsMap, -1)
		expect(next).toBe(1) // P1:reverse
	})

	it('skips reviewed reverse card, finds unreviewed forward card', () => {
		// Manifest: [P1:forward, P1:reverse, P2:forward]
		// P1:reverse reviewed, but P1:forward and P2:forward not reviewed.
		// Starting from index -1, P1:forward (index 0) is found first.
		const manifest: Array<ManifestEntry> = [
			`${P1}:forward`,
			`${P1}:reverse`,
			`${P2}:forward`,
		]
		const reviewsMap: ReviewsMap = {
			[`${P1}:reverse`]: stubReview(3),
		}

		const next = getIndexOfNextUnreviewedCard(manifest, reviewsMap, -1)
		expect(next).toBe(0) // P1:forward
	})

	it('returns manifest.length when all cards (both directions) are reviewed', () => {
		const manifest: Array<ManifestEntry> = [`${P1}:forward`, `${P1}:reverse`]
		const reviewsMap: ReviewsMap = {
			[`${P1}:forward`]: stubReview(3),
			[`${P1}:reverse`]: stubReview(2),
		}

		const next = getIndexOfNextUnreviewedCard(manifest, reviewsMap, -1)
		expect(next).toBe(manifest.length)
	})

	it('handles a realistic mixed manifest: forward-due, forward-new, reverse-due, reverse-new', () => {
		// This mirrors the 4-bucket ordering built by the review setup page
		const manifest: Array<ManifestEntry> = [
			`${P1}:forward`, // due
			`${P2}:forward`, // new
			`${P3}:forward`, // new
			`${P1}:reverse`, // due
			`${P2}:reverse`, // new
			`${P3}:reverse`, // new
		]

		// Suppose we've reviewed up through index 2 (all forward cards)
		const reviewsMap: ReviewsMap = {
			[`${P1}:forward`]: stubReview(3),
			[`${P2}:forward`]: stubReview(1),
			[`${P3}:forward`]: stubReview(4),
		}

		// Starting from currentCardIndex=2, the next unreviewed is index 3 (P1:reverse)
		const next = getIndexOfNextUnreviewedCard(manifest, reviewsMap, 2)
		expect(next).toBe(3)
	})

	it('does not confuse a forward review as covering the reverse card', () => {
		// This is the critical direction-isolation check:
		// Reviewing P1:forward should NOT mark P1:reverse as reviewed.
		const manifest: Array<ManifestEntry> = [`${P1}:forward`, `${P1}:reverse`]
		const reviewsMap: ReviewsMap = {
			[`${P1}:forward`]: stubReview(3),
			// P1:reverse is NOT in the map — it has not been reviewed
		}

		// Even though we're past index 0, index 1 is still unreviewed
		const next = getIndexOfNextUnreviewedCard(manifest, reviewsMap, 0)
		expect(next).toBe(1)
	})
})

describe('getIndexOfNextAgainCard', () => {
	it('finds the correct direction-specific Again card', () => {
		// P1:forward scored Good (3), P1:reverse scored Again (1)
		// Should find P1:reverse, not P1:forward.
		const manifest: Array<ManifestEntry> = [
			`${P1}:forward`,
			`${P1}:reverse`,
			`${P2}:forward`,
		]
		const reviewsMap: ReviewsMap = {
			[`${P1}:forward`]: stubReview(3),
			[`${P1}:reverse`]: stubReview(1),
			[`${P2}:forward`]: stubReview(3),
		}

		const next = getIndexOfNextAgainCard(manifest, reviewsMap, -1)
		expect(next).toBe(1) // P1:reverse
	})

	it('does not confuse forward Again with reverse Good for same phrase', () => {
		// P1:forward scored Again (1), P1:reverse scored Good (3)
		// Should find P1:forward, not P1:reverse.
		const manifest: Array<ManifestEntry> = [`${P1}:forward`, `${P1}:reverse`]
		const reviewsMap: ReviewsMap = {
			[`${P1}:forward`]: stubReview(1),
			[`${P1}:reverse`]: stubReview(3),
		}

		const next = getIndexOfNextAgainCard(manifest, reviewsMap, -1)
		expect(next).toBe(0) // P1:forward
	})

	it('wraps around the manifest to find Again cards before current index', () => {
		const manifest: Array<ManifestEntry> = [
			`${P1}:forward`,
			`${P2}:forward`,
			`${P1}:reverse`,
		]
		const reviewsMap: ReviewsMap = {
			[`${P1}:forward`]: stubReview(1), // Again
			[`${P2}:forward`]: stubReview(3), // Good
			[`${P1}:reverse`]: stubReview(3), // Good
		}

		// Currently at index 2 (P1:reverse). The only Again is at index 0 (P1:forward).
		// The function wraps: checks index 0 which is (2+1)%3=0 offset.
		const next = getIndexOfNextAgainCard(manifest, reviewsMap, 2)
		expect(next).toBe(0)
	})

	it('returns manifest.length when no Again cards exist', () => {
		const manifest: Array<ManifestEntry> = [`${P1}:forward`, `${P1}:reverse`]
		const reviewsMap: ReviewsMap = {
			[`${P1}:forward`]: stubReview(3),
			[`${P1}:reverse`]: stubReview(4),
		}

		const next = getIndexOfNextAgainCard(manifest, reviewsMap, -1)
		expect(next).toBe(manifest.length)
	})
})
