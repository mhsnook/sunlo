/**
 * Pure functions and types for the review system.
 * This module has NO runtime dependencies on supabase or React hooks,
 * so it can be safely imported in unit tests.
 */

import type { CardReviewType } from './schemas'
import type { CardDirectionType } from '@/features/deck/schemas'
import type { uuid } from '@/types/main'
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

/**
 * Returns the most recent phase-1 review for (pid, direction) from a session
 * strictly earlier than `beforeSession`. Used when updating today's phase-1
 * review — we need the chain's *predecessor*, not the newest phase-1 (which
 * is the row we're about to overwrite). Without this, re-scoring a card
 * within the session (e.g. to fix a mis-click) would wipe the prior chain
 * and rewrite the row with brand-new-card FSRS values.
 *
 * Why day_session and not created_at: the chain is one step per session, not
 * per timestamp. Session-based exclusion also tolerates legacy data with
 * multiple phase-1 rows in one session (`scripts/reclassify-phase1-duplicates`
 * cleans those up, but filtering by session means we'd never accidentally
 * pull a same-session sibling as our predecessor even if cleanup lagged).
 *
 * Returns `undefined` if no predecessor exists — correct semantics for a
 * card's first-ever phase-1 review.
 */
export function findChainPredecessor(
	reviews: Array<CardReviewType>,
	pid: uuid,
	direction: CardDirectionType,
	beforeSession: string
): CardReviewType | undefined {
	let best: CardReviewType | undefined = undefined
	for (const r of reviews) {
		if (r.phrase_id !== pid) continue
		if (r.direction !== direction) continue
		if (!r.day_first_review) continue
		if (r.day_session >= beforeSession) continue
		// Pick the newest by session; tiebreak by created_at only if two
		// phase-1 rows share a session (shouldn't happen post-reclassify).
		if (
			!best ||
			r.day_session > best.day_session ||
			(r.day_session === best.day_session && r.created_at > best.created_at)
		) {
			best = r
		}
	}
	return best
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
