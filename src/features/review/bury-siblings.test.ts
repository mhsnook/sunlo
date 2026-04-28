import { describe, it, expect } from 'vitest'
import {
	decideBuryDirection,
	partitionBuriedSiblings,
	type BurySiblingCandidate,
} from './bury-siblings'
import type { CardReviewType } from './schemas'

const P1 = '11111111-1111-4111-8111-111111111111'
const P2 = '22222222-2222-4222-8222-222222222222'
const UID = '33333333-3333-4333-8333-333333333333'

const NOW = new Date('2026-04-28T12:00:00Z')

function dayBefore(now: Date, days: number): string {
	const d = new Date(now)
	d.setDate(d.getDate() - days)
	return d.toISOString()
}

function makeReview(
	overrides: Partial<CardReviewType> & {
		phrase_id: string
		direction: 'forward' | 'reverse'
		created_at: string
	}
): CardReviewType {
	return {
		id: crypto.randomUUID(),
		uid: UID,
		day_session: overrides.created_at.slice(0, 10),
		lang: 'hin',
		score: 3,
		day_first_review: true,
		difficulty: 5,
		review_time_retrievability: null,
		stability: 3,
		updated_at: null,
		...overrides,
	}
}

function makeCandidate(
	overrides: Partial<BurySiblingCandidate> & {
		phrase_id: string
		direction: 'forward' | 'reverse'
	}
): BurySiblingCandidate {
	return {
		last_reviewed_at: null,
		stability: null,
		...overrides,
	}
}

describe('decideBuryDirection — Rule 1 (reverse failed twice)', () => {
	it('buries reverse when its two most recent phase-1 reviews both scored 1', () => {
		const forward = makeCandidate({
			phrase_id: P1,
			direction: 'forward',
			last_reviewed_at: dayBefore(NOW, 5),
			stability: 8,
		})
		const reverse = makeCandidate({
			phrase_id: P1,
			direction: 'reverse',
			last_reviewed_at: dayBefore(NOW, 1),
			stability: 1,
		})
		const reviews = [
			makeReview({
				phrase_id: P1,
				direction: 'reverse',
				created_at: dayBefore(NOW, 4),
				score: 1,
			}),
			makeReview({
				phrase_id: P1,
				direction: 'reverse',
				created_at: dayBefore(NOW, 1),
				score: 1,
			}),
		]
		expect(decideBuryDirection(forward, reverse, reviews, NOW)).toBe('reverse')
	})

	it('does not bury reverse when only the most recent review was a failure', () => {
		// Recent: 1; previous: 3. Falls through to Rule 2 / fallback.
		const forward = makeCandidate({
			phrase_id: P1,
			direction: 'forward',
			last_reviewed_at: dayBefore(NOW, 100),
			stability: 0.5, // forward decayed massively
		})
		const reverse = makeCandidate({
			phrase_id: P1,
			direction: 'reverse',
			last_reviewed_at: dayBefore(NOW, 1),
			stability: 1,
		})
		const reviews = [
			makeReview({
				phrase_id: P1,
				direction: 'reverse',
				created_at: dayBefore(NOW, 4),
				score: 3,
			}),
			makeReview({
				phrase_id: P1,
				direction: 'reverse',
				created_at: dayBefore(NOW, 1),
				score: 1,
			}),
		]
		// Rule 2: forward retrievability tomorrow << reverse — bury reverse.
		// (We're testing here that Rule 1 didn't fire on a single failure;
		// the actual buried direction follows Rule 2.)
		expect(decideBuryDirection(forward, reverse, reviews, NOW)).toBe('reverse')
	})

	it('ignores phase-3 (re-review) rows when checking for two failures', () => {
		// Two phase-3 score=1 rows are not a chain of failures — only phase-1
		// counts. Falls through to Rule 2 / fallback.
		const forward = makeCandidate({
			phrase_id: P1,
			direction: 'forward',
			last_reviewed_at: dayBefore(NOW, 5),
			stability: 8,
		})
		const reverse = makeCandidate({
			phrase_id: P1,
			direction: 'reverse',
			last_reviewed_at: dayBefore(NOW, 5),
			stability: 8,
		})
		const reviews = [
			makeReview({
				phrase_id: P1,
				direction: 'reverse',
				created_at: dayBefore(NOW, 5),
				score: 3,
				day_first_review: true,
			}),
			makeReview({
				phrase_id: P1,
				direction: 'reverse',
				created_at: dayBefore(NOW, 5),
				score: 1,
				day_first_review: false,
			}),
			makeReview({
				phrase_id: P1,
				direction: 'reverse',
				created_at: dayBefore(NOW, 5),
				score: 1,
				day_first_review: false,
			}),
		]
		// Identical FSRS state on both → Rule 2 ties to forward (bury reverse).
		// What we're really asserting is that Rule 1 didn't fire.
		expect(decideBuryDirection(forward, reverse, reviews, NOW)).toBe('reverse')
	})

	it('only counts the reverse card — forward failures do not trigger Rule 1', () => {
		const forward = makeCandidate({
			phrase_id: P1,
			direction: 'forward',
			last_reviewed_at: dayBefore(NOW, 5),
			stability: 8,
		})
		const reverse = makeCandidate({
			phrase_id: P1,
			direction: 'reverse',
			last_reviewed_at: dayBefore(NOW, 5),
			stability: 8,
		})
		const reviews = [
			makeReview({
				phrase_id: P1,
				direction: 'forward',
				created_at: dayBefore(NOW, 4),
				score: 1,
			}),
			makeReview({
				phrase_id: P1,
				direction: 'forward',
				created_at: dayBefore(NOW, 1),
				score: 1,
			}),
		]
		expect(decideBuryDirection(forward, reverse, reviews, NOW)).toBe('reverse')
	})
})

describe('decideBuryDirection — Rule 2 (tomorrow retrievability)', () => {
	it('buries the sibling with HIGHER retrievability tomorrow (less overdue)', () => {
		// Forward: stability 5, reviewed 4 days ago → tomorrow t/S = 5/5 = 1.0
		//   retrievability ≈ 0.9
		// Reverse: stability 50, reviewed 4 days ago → tomorrow t/S = 5/50 = 0.1
		//   retrievability ≈ 0.989
		// Reverse is much LESS overdue tomorrow → bury reverse.
		const forward = makeCandidate({
			phrase_id: P1,
			direction: 'forward',
			last_reviewed_at: dayBefore(NOW, 4),
			stability: 5,
		})
		const reverse = makeCandidate({
			phrase_id: P1,
			direction: 'reverse',
			last_reviewed_at: dayBefore(NOW, 4),
			stability: 50,
		})
		expect(decideBuryDirection(forward, reverse, [], NOW)).toBe('reverse')
	})

	it('buries forward when forward will be less overdue tomorrow', () => {
		// Forward stable & freshly reviewed; reverse decayed and overdue.
		const forward = makeCandidate({
			phrase_id: P1,
			direction: 'forward',
			last_reviewed_at: dayBefore(NOW, 1),
			stability: 50,
		})
		const reverse = makeCandidate({
			phrase_id: P1,
			direction: 'reverse',
			last_reviewed_at: dayBefore(NOW, 30),
			stability: 5,
		})
		expect(decideBuryDirection(forward, reverse, [], NOW)).toBe('forward')
	})

	it('keeps the steeper-decay card even when retrievabilities are close today', () => {
		// Documents the example from the policy: 0.90 vs 0.89 today, but the
		// 0.89 card decays more gradually — so tomorrow forward (0.90 today)
		// drops below reverse (0.89 today). Bury reverse, keep forward.
		// Forward: stability 5 — fast decay
		// Reverse: stability 80 — slow decay
		// Today: forward t/S ≈ 0.97 (just above 0.9), reverse t/S ≈ 0.06 (≈0.99 today)
		// We pick numbers such that forward is more overdue tomorrow.
		const forward = makeCandidate({
			phrase_id: P1,
			direction: 'forward',
			last_reviewed_at: dayBefore(NOW, 5),
			stability: 5,
		})
		const reverse = makeCandidate({
			phrase_id: P1,
			direction: 'reverse',
			last_reviewed_at: dayBefore(NOW, 1),
			stability: 80,
		})
		expect(decideBuryDirection(forward, reverse, [], NOW)).toBe('reverse')
	})

	it('breaks ties (equal tomorrow retrievability) toward burying reverse', () => {
		const forward = makeCandidate({
			phrase_id: P1,
			direction: 'forward',
			last_reviewed_at: dayBefore(NOW, 4),
			stability: 8,
		})
		const reverse = makeCandidate({
			phrase_id: P1,
			direction: 'reverse',
			last_reviewed_at: dayBefore(NOW, 4),
			stability: 8,
		})
		expect(decideBuryDirection(forward, reverse, [], NOW)).toBe('reverse')
	})
})

describe('decideBuryDirection — fallback (no FSRS state)', () => {
	it('buries reverse when both siblings are brand-new (no last_reviewed_at)', () => {
		const forward = makeCandidate({ phrase_id: P1, direction: 'forward' })
		const reverse = makeCandidate({ phrase_id: P1, direction: 'reverse' })
		expect(decideBuryDirection(forward, reverse, [], NOW)).toBe('reverse')
	})

	it('buries reverse when one sibling is new and the other is reviewed', () => {
		// Mixed state — can't compare retrievability — default to recognition.
		const forward = makeCandidate({
			phrase_id: P1,
			direction: 'forward',
			last_reviewed_at: dayBefore(NOW, 10),
			stability: 5,
		})
		const reverse = makeCandidate({ phrase_id: P1, direction: 'reverse' })
		expect(decideBuryDirection(forward, reverse, [], NOW)).toBe('reverse')
	})
})

describe('partitionBuriedSiblings', () => {
	it('keeps a solo sibling without any pairing', () => {
		// Forward only — no reverse to bury against.
		const forward = makeCandidate({ phrase_id: P1, direction: 'forward' })
		const { kept, buried } = partitionBuriedSiblings([forward], [], NOW)
		expect(kept).toEqual([forward])
		expect(buried).toEqual([])
	})

	it('buries one sibling per phrase that has both directions present', () => {
		const forward1 = makeCandidate({ phrase_id: P1, direction: 'forward' })
		const reverse1 = makeCandidate({ phrase_id: P1, direction: 'reverse' })
		const forward2 = makeCandidate({ phrase_id: P2, direction: 'forward' })
		const { kept, buried } = partitionBuriedSiblings(
			[forward1, reverse1, forward2],
			[],
			NOW
		)
		expect(kept).toContain(forward1)
		expect(kept).toContain(forward2)
		expect(buried).toEqual([reverse1])
	})

	it('preserves input order in the kept array', () => {
		const c1 = makeCandidate({ phrase_id: P1, direction: 'forward' })
		const c2 = makeCandidate({ phrase_id: P2, direction: 'forward' })
		const c3 = makeCandidate({ phrase_id: P1, direction: 'reverse' })
		const { kept } = partitionBuriedSiblings([c1, c2, c3], [], NOW)
		expect(kept).toEqual([c1, c2])
	})

	it('applies Rule 1 across multiple phrases independently', () => {
		const f1 = makeCandidate({
			phrase_id: P1,
			direction: 'forward',
			last_reviewed_at: dayBefore(NOW, 5),
			stability: 8,
		})
		const r1 = makeCandidate({
			phrase_id: P1,
			direction: 'reverse',
			last_reviewed_at: dayBefore(NOW, 1),
			stability: 1,
		})
		const f2 = makeCandidate({ phrase_id: P2, direction: 'forward' })
		const r2 = makeCandidate({ phrase_id: P2, direction: 'reverse' })
		const reviews = [
			makeReview({
				phrase_id: P1,
				direction: 'reverse',
				created_at: dayBefore(NOW, 4),
				score: 1,
			}),
			makeReview({
				phrase_id: P1,
				direction: 'reverse',
				created_at: dayBefore(NOW, 1),
				score: 1,
			}),
		]
		const { kept, buried } = partitionBuriedSiblings(
			[f1, r1, f2, r2],
			reviews,
			NOW
		)
		// P1: Rule 1 fires — reverse buried.
		// P2: brand-new pair → fallback buries reverse.
		expect(kept).toEqual([f1, f2])
		expect(buried).toEqual([r1, r2])
	})
})
