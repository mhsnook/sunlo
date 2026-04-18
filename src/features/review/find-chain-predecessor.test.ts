import { describe, it, expect } from 'vitest'
import { findChainPredecessor } from './review-utils'
import { calculateFSRS } from './fsrs'
import type { CardReviewType } from './schemas'

const P1 = '00000000-0000-0000-0000-000000000001'
const P2 = '00000000-0000-0000-0000-000000000002'

function makeReview(
	overrides: Partial<CardReviewType> & {
		phrase_id: string
		direction: 'forward' | 'reverse'
		created_at: string
	}
): CardReviewType {
	return {
		id: crypto.randomUUID(),
		uid: '00000000-0000-0000-0000-aaaaaaaaaaaa',
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

describe('findChainPredecessor', () => {
	it('returns the most recent phase-1 review from a strictly earlier session', () => {
		const yesterday = makeReview({
			phrase_id: P1,
			direction: 'forward',
			created_at: '2025-06-01T12:00:00Z',
			difficulty: 5,
			stability: 40,
		})
		const today = makeReview({
			phrase_id: P1,
			direction: 'forward',
			created_at: '2025-06-30T12:00:00Z',
			difficulty: 4.9,
			stability: 45,
		})
		const pred = findChainPredecessor(
			[yesterday, today],
			P1,
			'forward',
			today.day_session
		)
		expect(pred?.id).toBe(yesterday.id)
	})

	it('returns undefined when no earlier session exists', () => {
		const today = makeReview({
			phrase_id: P1,
			direction: 'forward',
			created_at: '2025-06-30T12:00:00Z',
		})
		expect(
			findChainPredecessor([today], P1, 'forward', today.day_session)
		).toBeUndefined()
	})

	it('isolates by phrase_id and direction', () => {
		const reviews = [
			makeReview({
				phrase_id: P1,
				direction: 'forward',
				created_at: '2025-06-01T00:00:00Z',
			}),
			makeReview({
				phrase_id: P2,
				direction: 'forward',
				created_at: '2025-06-02T00:00:00Z',
			}),
			makeReview({
				phrase_id: P1,
				direction: 'reverse',
				created_at: '2025-06-03T00:00:00Z',
			}),
		]
		const pred = findChainPredecessor(reviews, P1, 'forward', '2025-06-30')
		expect(pred?.phrase_id).toBe(P1)
		expect(pred?.direction).toBe('forward')
	})

	it('skips phase-3 rows (day_first_review=false)', () => {
		// Even if a phase-3 row exists in an earlier session (shouldn't happen
		// post-reclassify, but defensive), it shouldn't feed the scheduling
		// chain. Only phase-1 rows do.
		const phase1 = makeReview({
			phrase_id: P1,
			direction: 'forward',
			created_at: '2025-06-01T08:00:00Z',
			day_first_review: true,
		})
		const phase3 = makeReview({
			phrase_id: P1,
			direction: 'forward',
			created_at: '2025-06-10T08:30:00Z',
			day_first_review: false,
		})
		const pred = findChainPredecessor(
			[phase1, phase3],
			P1,
			'forward',
			'2025-06-30'
		)
		expect(pred?.id).toBe(phase1.id)
	})

	it('excludes the current session entirely (never returns a same-session row)', () => {
		// Re-scoring within the same session: all today's rows — including the
		// one we're updating AND any legacy duplicates from a historical bug —
		// must be excluded so we never feed the chain back into itself.
		const currentSession = '2025-06-30'
		const todayFirst = makeReview({
			phrase_id: P1,
			direction: 'forward',
			created_at: '2025-06-30T08:00:00Z',
			day_session: currentSession,
		})
		const todaySecond = makeReview({
			phrase_id: P1,
			direction: 'forward',
			created_at: '2025-06-30T08:05:00Z',
			day_session: currentSession,
		})
		const earlier = makeReview({
			phrase_id: P1,
			direction: 'forward',
			created_at: '2025-06-01T12:00:00Z',
		})
		const pred = findChainPredecessor(
			[todayFirst, todaySecond, earlier],
			P1,
			'forward',
			currentSession
		)
		expect(pred?.id).toBe(earlier.id)
	})

	it('picks the newest session when multiple earlier sessions exist', () => {
		const twoWeeksAgo = makeReview({
			phrase_id: P1,
			direction: 'forward',
			created_at: '2025-06-01T12:00:00Z',
			difficulty: 5,
			stability: 10,
		})
		const yesterday = makeReview({
			phrase_id: P1,
			direction: 'forward',
			created_at: '2025-06-14T12:00:00Z',
			difficulty: 4.8,
			stability: 20,
		})
		const pred = findChainPredecessor(
			[twoWeeksAgo, yesterday],
			P1,
			'forward',
			'2025-06-15'
		)
		expect(pred?.id).toBe(yesterday.id)
	})
})

// ---------------------------------------------------------------------------
// The bug this fix addresses
// ---------------------------------------------------------------------------
// When a user mis-clicks during a review and re-scores within the same
// session, the update path of useReviewMutation used to pass
//   previousReview: latestReview?.id !== prevDataToday.id ? latestReview : undefined
// where `latestReview` (from useLatestReviewForPhrase) is the newest phase-1
// review for this (pid, direction) — which, in the update path, is the row
// being updated itself. So the ternary passed `undefined` and calculateFSRS
// treated the re-score as a first review, wiping the prior chain.
//
// The fix: look up the chain predecessor (the newest phase-1 review from
// any strictly earlier session) and pass THAT as previousReview. These
// tests assert the observable effect — the re-scored row must reflect the
// prior chain, not fresh initial values.
// ---------------------------------------------------------------------------

describe('re-score preserves the scheduling chain (the §2 bug)', () => {
	it('a long-established card re-scored Hard still has chain-derived stability', () => {
		// Card with 40-day stability from a long history.
		const yesterday = makeReview({
			phrase_id: P1,
			direction: 'forward',
			created_at: '2025-06-01T12:00:00Z',
			difficulty: 5,
			stability: 40,
		})
		// Today the user scored Good (writing this row), chain rebuilt from
		// yesterday. Now they want to re-score as Hard.
		const todayGood = makeReview({
			phrase_id: P1,
			direction: 'forward',
			created_at: '2025-06-30T12:00:00Z',
			difficulty: 5,
			stability: 45,
		})
		const reviews = [yesterday, todayGood]

		const pred = findChainPredecessor(
			reviews,
			P1,
			'forward',
			todayGood.day_session
		)
		expect(pred?.id).toBe(yesterday.id) // NOT todayGood

		const rescored = calculateFSRS({
			score: 2, // Hard
			previousReview: pred,
			currentTime: new Date(todayGood.created_at),
		})

		// Hard-from-40-day-chain produces a stability much higher than
		// initial (1.18). If the bug regresses, rescored.stability collapses
		// to ~1.18.
		expect(rescored.stability).toBeGreaterThan(30)
	})

	it('re-scoring Again still collapses stability (Again lapses by design)', () => {
		// This is a sanity check: the fix restores the chain, but the FSRS
		// math still behaves correctly. Again after a long history produces
		// a stability well below the chain's, but it's the lapse formula,
		// not the initial-value formula.
		const yesterday = makeReview({
			phrase_id: P1,
			direction: 'forward',
			created_at: '2025-06-01T12:00:00Z',
			difficulty: 5,
			stability: 40,
		})
		const todayGood = makeReview({
			phrase_id: P1,
			direction: 'forward',
			created_at: '2025-06-30T12:00:00Z',
		})
		const pred = findChainPredecessor(
			[yesterday, todayGood],
			P1,
			'forward',
			todayGood.day_session
		)
		const rescored = calculateFSRS({
			score: 1, // Again
			previousReview: pred,
			currentTime: new Date(todayGood.created_at),
		})
		// Lapse should retain non-trivial stability (difficulty-weighted
		// penalty, not initialStability(1)=0.40).
		expect(rescored.stability).toBeGreaterThan(0.5)
		expect(rescored.stability).toBeLessThan(40)
	})

	it('a brand-new card re-scored still uses initial values (no chain to preserve)', () => {
		// Card has no prior phase-1 reviews. First score today was Again;
		// user now re-scores Good. Predecessor is undefined, which is
		// correct — calculateFSRS falls back to initial values.
		const todayAgain = makeReview({
			phrase_id: P1,
			direction: 'forward',
			created_at: '2025-06-30T12:00:00Z',
			difficulty: null,
			stability: null,
		})
		const pred = findChainPredecessor(
			[todayAgain],
			P1,
			'forward',
			todayAgain.day_session
		)
		expect(pred).toBeUndefined()

		const rescored = calculateFSRS({
			score: 3, // Good
			previousReview: undefined,
			currentTime: new Date(todayAgain.created_at),
		})
		// initialStability(3) ≈ 3.173
		expect(rescored.stability).toBeCloseTo(3.173, 2)
		expect(rescored.retrievability).toBeNull()
	})
})
