/**
 * Bury-siblings: keeps one of a phrase's two direction cards out of today's
 * manifest when both are eligible. The policy, its four ordered rules, and the
 * reasoning behind them are in `docs/review.md` — the routes layer builds the
 * manifest and depends on them, so they live where that layer can read them.
 *
 * Two things about the implementation that the policy doesn't say:
 *
 * Rule 3 compares retrievability at t+1 day rather than today, so the ordering
 * can invert. Two cards at 0.90 and 0.89 today may swap by tomorrow if the
 * second decays more gradually, and the one that will be lower tomorrow is the
 * one kept.
 *
 * A buried sibling is not recorded anywhere. There is no deferred flag to
 * clear — it is simply absent from the manifest and eligible again tomorrow.
 */

import type { CardReviewType } from './schemas'
import type { CardDirectionType } from '@/features/deck/schemas'
import type { uuid } from '@/types/main'
import { retrievability } from './fsrs'
import { isScoringReview } from './review-utils'
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
				isScoringReview(r)
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
 * a candidate with no sibling in the set is kept.
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
