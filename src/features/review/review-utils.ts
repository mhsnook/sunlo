/**
 * Pure functions and types for the review system.
 * This module has NO runtime dependencies on supabase or React hooks,
 * so it can be safely imported in unit tests.
 */

import type { CardReviewType } from './schemas'
import { toManifestEntry, type ManifestEntry } from './manifest'

/*
	null: not yet initialised (zustand store only)
	1. doing the first review
	2. going back for unreviewed
	3. skip unreviewed and see screen asking to re-review
	4. doing re-reviews
	5. skip re-reviews and end
*/
export type ReviewStages = null | 1 | 2 | 3 | 4 | 5
export type ReviewsMap = {
	[key: ManifestEntry]: CardReviewType
}

/** Build a ReviewsMap keyed by manifest entry (phrase_id:direction) */
export function buildReviewsMap(reviews: Array<CardReviewType>): ReviewsMap {
	const map: ReviewsMap = {}
	// Iterate in chronological order so the last (newest) review wins per key
	for (const r of reviews) {
		map[toManifestEntry(r.phrase_id, r.direction)] = r
	}
	return map
}

/**
 * Build a Map of first-try reviews keyed by manifest entry.
 * Use this instead of hand-rolling a Map — the branded key type prevents
 * accidentally keying by bare phrase_id (which silently misses reverse cards
 * and any lookup against a manifest).
 */
export function firstTryReviewMap(
	reviews: Array<CardReviewType>
): Map<ManifestEntry, CardReviewType> {
	return new Map(
		reviews
			.filter((r) => r.day_first_review === true)
			.map((r) => [toManifestEntry(r.phrase_id, r.direction), r])
	)
}

export function getIndexOfNextUnreviewedCard(
	manifest: Array<ManifestEntry>,
	reviewsMap: ReviewsMap,
	currentCardIndex: number
) {
	const index = manifest.findIndex((entry, i) => {
		// if we're currently at card 3 of 40, don't even check cards 0-3
		// but if we're at 40/40 we should check from the start
		if (currentCardIndex !== manifest.length && i <= currentCardIndex)
			return false
		// if the entry is undefined, it means we haven't reviewed this card yet
		return !reviewsMap[entry]
	})

	return index !== -1 ? index : manifest.length
}

export function getIndexOfNextAgainCard(
	manifest: Array<ManifestEntry>,
	reviewsMap: ReviewsMap,
	currentCardIndex: number
) {
	const index = manifest.findIndex((_, i) => {
		// we want first to check state.currentCardIndex + 1
		const indexChecking = (i + currentCardIndex + 1) % manifest.length
		return reviewsMap[manifest[indexChecking]]?.score === 1
	})
	return index !== -1 ?
			(index + currentCardIndex + 1) % manifest.length
		:	manifest.length
}
