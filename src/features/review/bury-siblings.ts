/**
 * Bury-siblings policy: when a phrase has both forward and reverse cards
 * eligible for today's review, only one should appear in the manifest.
 * Showing both wastes attention — having just answered "house → casa", being
 * asked "casa → house" a few cards later isn't a meaningful retrieval.
 *
 * The other sibling isn't recorded as deferred anywhere; we just leave it out
 * of today's manifest and it falls back into normal scheduling tomorrow.
 *
 * Rules, in order:
 *
 *   0. First-day exception: when BOTH siblings are unreviewed, keep both.
 *      The very first encounter pairs recognition then recall in one session
 *      to anchor the new phrase; standard bury-siblings kicks in starting on
 *      the second session.
 *
 *   1. If the reverse sibling's two most recent phase-1 reviews both scored 1
 *      (Again), bury the reverse and show the forward today. Piling on a
 *      third failure attempt isn't useful — let the user re-anchor recognition
 *      first and try recall again on a later session.
 *
 *   2. Otherwise, bury whichever sibling will be LESS overdue tomorrow — the
 *      one whose retrievability at t+1 day is HIGHER. The card that decays
 *      faster has the greater cost-of-deferring, so we keep it. (Concretely:
 *      two cards with retrievabilities 0.90 and 0.89 today might invert by
 *      tomorrow if the second decays more gradually, in which case we still
 *      keep the first.)
 *
 *   3. Fallback when retrievability can't be compared (one sibling reviewed
 *      and one not, so no apples-to-apples retrievability): bury the reverse
 *      and show the forward. Recognition before recall is the safer default.
 */

import type { CardReviewType } from './schemas'
import type { CardDirectionType } from '@/features/deck/schemas'
import type { uuid } from '@/types/main'
import { retrievability } from './fsrs'
import { dateDiff } from '@/lib/utils'

export interface BurySiblingCandidate {
	phrase_id: uuid
	direction: CardDirectionType
	last_reviewed_at: string | null
	stability: number | null
}

/**
 * Decide which sibling to bury when both forward and reverse are eligible.
 * Returns the direction that should be DROPPED from the manifest, or `null`
 * when both should be kept (first-day exception).
 */
export function decideBuryDirection(
	forward: BurySiblingCandidate,
	reverse: BurySiblingCandidate,
	reviews: ReadonlyArray<CardReviewType>,
	now: Date = new Date()
): CardDirectionType | null {
	// Rule 0: brand-new pair — keep both so recognition and recall happen
	// in the same first session.
	if (!forward.last_reviewed_at && !reverse.last_reviewed_at) {
		return null
	}

	if (reverseFailedTwiceInARow(reverse.phrase_id, reviews)) {
		return 'reverse'
	}

	const tomorrowBury = decideBuryByTomorrowRetrievability(forward, reverse, now)
	if (tomorrowBury) return tomorrowBury

	return 'reverse'
}

/**
 * True when the reverse card's two most recent phase-1 reviews both scored 1.
 * Phase-3 (re-review) rows are excluded — the chain only counts first-of-day
 * reviews. Sorting keys on (day_session, created_at) so multiple phase-1 rows
 * within a single legacy session still order deterministically.
 */
function reverseFailedTwiceInARow(
	phrase_id: uuid,
	reviews: ReadonlyArray<CardReviewType>
): boolean {
	const recent = reviews
		.filter(
			(r) =>
				r.phrase_id === phrase_id &&
				r.direction === 'reverse' &&
				r.day_first_review === true
		)
		.toSorted((a, b) =>
			a.day_session === b.day_session
				? a.created_at.localeCompare(b.created_at)
				: a.day_session.localeCompare(b.day_session)
		)
	if (recent.length < 2) return false
	const last = recent[recent.length - 1]
	const prev = recent[recent.length - 2]
	return last.score === 1 && prev.score === 1
}

/**
 * Bury the sibling with the higher tomorrow-retrievability (less overdue
 * tomorrow → cheaper to defer). Returns undefined when at least one sibling
 * lacks the FSRS state needed to compute retrievability.
 */
function decideBuryByTomorrowRetrievability(
	forward: BurySiblingCandidate,
	reverse: BurySiblingCandidate,
	now: Date
): CardDirectionType | undefined {
	if (
		!forward.last_reviewed_at ||
		forward.stability == null ||
		!reverse.last_reviewed_at ||
		reverse.stability == null
	) {
		return undefined
	}
	const tomorrow = new Date(now)
	tomorrow.setDate(tomorrow.getDate() + 1)

	const forwardR = retrievability(
		dateDiff(forward.last_reviewed_at, tomorrow),
		forward.stability
	)
	const reverseR = retrievability(
		dateDiff(reverse.last_reviewed_at, tomorrow),
		reverse.stability
	)
	// Bury the higher retrievability (less overdue tomorrow). Ties go to
	// burying reverse so the user gets recognition rather than recall.
	return forwardR > reverseR ? 'forward' : 'reverse'
}

/**
 * Partition a candidate set into kept vs. buried. A candidate is buried only
 * when its sibling (same phrase_id, opposite direction) is also a candidate;
 * solo siblings are always kept.
 */
export function partitionBuriedSiblings<T extends BurySiblingCandidate>(
	candidates: ReadonlyArray<T>,
	reviews: ReadonlyArray<CardReviewType>,
	now: Date = new Date()
): { kept: Array<T>; buried: Array<T> } {
	const byPhrase = new Map<uuid, { forward?: T; reverse?: T }>()
	for (const c of candidates) {
		const entry = byPhrase.get(c.phrase_id) ?? {}
		if (c.direction === 'forward') entry.forward = c
		else entry.reverse = c
		byPhrase.set(c.phrase_id, entry)
	}

	const buriedSet = new Set<T>()
	for (const { forward, reverse } of byPhrase.values()) {
		if (!forward || !reverse) continue
		const buryDir = decideBuryDirection(forward, reverse, reviews, now)
		if (buryDir === null) continue
		buriedSet.add(buryDir === 'forward' ? forward : reverse)
	}

	const kept: Array<T> = []
	const buried: Array<T> = []
	for (const c of candidates) {
		if (buriedSet.has(c)) buried.push(c)
		else kept.push(c)
	}
	return { kept, buried }
}
