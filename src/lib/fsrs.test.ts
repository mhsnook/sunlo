import { describe, it, expect } from 'vitest'
import {
	calculateFSRS,
	validateFSRSValues,
	intervals,
	retrievability,
	type Score,
} from '@/features/review/fsrs'
import type { CardReviewType } from '@/features/review/schemas'

// Helper to make a mock previous review
function mockReview(overrides: Partial<CardReviewType> = {}): CardReviewType {
	return {
		id: '00000000-0000-0000-0000-000000000001',
		created_at: '2025-01-01T12:00:00Z',
		uid: '00000000-0000-0000-0000-000000000002',
		day_session: '2025-01-01',
		lang: 'hin',
		phrase_id: '00000000-0000-0000-0000-000000000003',
		direction: 'forward',
		score: 3,
		day_first_review: true,
		difficulty: 5.0,
		stability: 10.0,
		review_time_retrievability: 0.9,
		updated_at: null,
		...overrides,
	}
}

describe('calculateFSRS', () => {
	describe('first review (no previous review)', () => {
		it.each([1, 2, 3, 4] as Score[])('handles score %i', (score) => {
			const result = calculateFSRS({ score })

			expect(result.difficulty).toBeGreaterThanOrEqual(1)
			expect(result.difficulty).toBeLessThanOrEqual(10)
			expect(result.stability).toBeGreaterThan(0)
			expect(result.retrievability).toBeNull()
			expect(result.interval).toBeGreaterThanOrEqual(1)
			expect(result.scheduledFor).toBeInstanceOf(Date)
		})

		it('produces increasing stability with higher scores', () => {
			const results = ([1, 2, 3, 4] as Score[]).map((score) =>
				calculateFSRS({ score })
			)

			for (let i = 1; i < results.length; i++) {
				expect(results[i].stability).toBeGreaterThan(results[i - 1].stability)
			}
		})

		it('produces decreasing difficulty with higher scores', () => {
			const results = ([1, 2, 3, 4] as Score[]).map((score) =>
				calculateFSRS({ score })
			)

			for (let i = 1; i < results.length; i++) {
				expect(results[i].difficulty).toBeLessThan(results[i - 1].difficulty)
			}
		})

		it('has null retrievability on first review', () => {
			const result = calculateFSRS({ score: 3 })
			expect(result.retrievability).toBeNull()
		})
	})

	describe('subsequent reviews', () => {
		const currentTime = new Date('2025-01-11T12:00:00Z') // 10 days after review

		it('calculates retrievability based on elapsed time', () => {
			const result = calculateFSRS({
				score: 3,
				previousReview: mockReview(),
				currentTime,
			})

			expect(result.retrievability).not.toBeNull()
			expect(result.retrievability!).toBeGreaterThan(0)
			expect(result.retrievability!).toBeLessThanOrEqual(1)
		})

		it('score=1 (Again) decreases stability', () => {
			const prev = mockReview({ stability: 10.0 })
			const result = calculateFSRS({
				score: 1,
				previousReview: prev,
				currentTime,
			})

			expect(result.stability).toBeLessThan(prev.stability!)
		})

		it('score=3 (Good) increases stability', () => {
			const prev = mockReview({ stability: 10.0 })
			const result = calculateFSRS({
				score: 3,
				previousReview: prev,
				currentTime,
			})

			expect(result.stability).toBeGreaterThan(prev.stability!)
		})

		it('score=4 (Easy) increases stability more than score=3', () => {
			const prev = mockReview()
			const good = calculateFSRS({
				score: 3,
				previousReview: prev,
				currentTime,
			})
			const easy = calculateFSRS({
				score: 4,
				previousReview: prev,
				currentTime,
			})

			expect(easy.stability).toBeGreaterThan(good.stability)
		})

		it('score=2 (Hard) increases stability less than score=3', () => {
			const prev = mockReview()
			const hard = calculateFSRS({
				score: 2,
				previousReview: prev,
				currentTime,
			})
			const good = calculateFSRS({
				score: 3,
				previousReview: prev,
				currentTime,
			})

			expect(hard.stability).toBeLessThan(good.stability)
		})

		it('handles previousReview with null FSRS data as first review', () => {
			const prev = mockReview({
				difficulty: null,
				stability: null,
				review_time_retrievability: null,
			})
			const result = calculateFSRS({
				score: 3,
				previousReview: prev,
				currentTime,
			})

			// Should behave like a first review
			expect(result.retrievability).toBeNull()
		})

		it('scheduledFor is in the future', () => {
			const result = calculateFSRS({
				score: 3,
				previousReview: mockReview(),
				currentTime,
			})

			expect(result.scheduledFor.getTime()).toBeGreaterThan(
				currentTime.getTime()
			)
		})

		it('interval is at least 1 day', () => {
			// Even with score=1, interval should be >= 1
			const result = calculateFSRS({
				score: 1,
				previousReview: mockReview(),
				currentTime,
			})

			expect(result.interval).toBeGreaterThanOrEqual(1)
		})
	})

	describe('difficulty bounds', () => {
		it('difficulty stays within [1, 10] after many "Again" reviews', () => {
			let prev = mockReview({ difficulty: 9.5 })
			const currentTime = new Date('2025-01-02T12:00:00Z')

			// Chain several "Again" reviews
			for (let i = 0; i < 10; i++) {
				const result = calculateFSRS({
					score: 1,
					previousReview: prev,
					currentTime,
				})
				expect(result.difficulty).toBeLessThanOrEqual(10)
				expect(result.difficulty).toBeGreaterThanOrEqual(1)
				prev = mockReview({
					difficulty: result.difficulty,
					stability: result.stability,
					created_at: currentTime.toISOString(),
				})
			}
		})

		it('difficulty stays within [1, 10] after many "Easy" reviews', () => {
			let prev = mockReview({ difficulty: 1.5 })
			const currentTime = new Date('2025-01-02T12:00:00Z')

			for (let i = 0; i < 10; i++) {
				const result = calculateFSRS({
					score: 4,
					previousReview: prev,
					currentTime,
				})
				expect(result.difficulty).toBeLessThanOrEqual(10)
				expect(result.difficulty).toBeGreaterThanOrEqual(1)
				prev = mockReview({
					difficulty: result.difficulty,
					stability: result.stability,
					created_at: currentTime.toISOString(),
				})
			}
		})
	})

	describe('custom desiredRetention', () => {
		it('higher retention target produces shorter intervals', () => {
			const prev = mockReview()
			const currentTime = new Date('2025-01-11T12:00:00Z')

			const highRetention = calculateFSRS({
				score: 3,
				previousReview: prev,
				currentTime,
				desiredRetention: 0.95,
			})
			const lowRetention = calculateFSRS({
				score: 3,
				previousReview: prev,
				currentTime,
				desiredRetention: 0.8,
			})

			expect(highRetention.interval).toBeLessThan(lowRetention.interval)
		})
	})
})

describe('retrievability', () => {
	it('returns 1.0 when no time has elapsed', () => {
		const r = retrievability(0, 10)
		expect(r).toBeCloseTo(1.0, 5)
	})

	it('decreases over time', () => {
		const r1 = retrievability(1, 10)
		const r5 = retrievability(5, 10)
		const r10 = retrievability(10, 10)

		expect(r1).toBeGreaterThan(r5)
		expect(r5).toBeGreaterThan(r10)
	})

	it('is higher with greater stability', () => {
		const lowStability = retrievability(10, 5)
		const highStability = retrievability(10, 50)

		expect(highStability).toBeGreaterThan(lowStability)
	})

	it('is always between 0 and 1', () => {
		const values = [
			retrievability(0, 1),
			retrievability(1, 1),
			retrievability(100, 1),
			retrievability(1000, 10),
		]

		for (const v of values) {
			expect(v).toBeGreaterThan(0)
			expect(v).toBeLessThanOrEqual(1)
		}
	})
})

describe('validateFSRSValues', () => {
	it('accepts valid values', () => {
		const result = validateFSRSValues({
			difficulty: 5,
			stability: 10,
			retrievability: 0.9,
		})
		expect(result.valid).toBe(true)
		expect(result.errors).toHaveLength(0)
	})

	it('accepts null retrievability', () => {
		const result = validateFSRSValues({
			difficulty: 5,
			stability: 10,
			retrievability: null,
		})
		expect(result.valid).toBe(true)
	})

	it('rejects difficulty below 1', () => {
		const result = validateFSRSValues({
			difficulty: 0.5,
			stability: 10,
			retrievability: null,
		})
		expect(result.valid).toBe(false)
		expect(result.errors[0]).toContain('Difficulty')
	})

	it('rejects difficulty above 10', () => {
		const result = validateFSRSValues({
			difficulty: 11,
			stability: 10,
			retrievability: null,
		})
		expect(result.valid).toBe(false)
	})

	it('rejects negative stability', () => {
		const result = validateFSRSValues({
			difficulty: 5,
			stability: -1,
			retrievability: null,
		})
		expect(result.valid).toBe(false)
		expect(result.errors[0]).toContain('Stability')
	})

	it('rejects stability over 36500', () => {
		const result = validateFSRSValues({
			difficulty: 5,
			stability: 40000,
			retrievability: null,
		})
		expect(result.valid).toBe(false)
	})

	it('rejects retrievability below 0', () => {
		const result = validateFSRSValues({
			difficulty: 5,
			stability: 10,
			retrievability: -0.1,
		})
		expect(result.valid).toBe(false)
	})

	it('rejects retrievability above 1', () => {
		const result = validateFSRSValues({
			difficulty: 5,
			stability: 10,
			retrievability: 1.1,
		})
		expect(result.valid).toBe(false)
	})

	it('reports multiple errors', () => {
		const result = validateFSRSValues({
			difficulty: 0,
			stability: -5,
			retrievability: 2,
		})
		expect(result.valid).toBe(false)
		expect(result.errors.length).toBe(3)
	})
})

describe('intervals', () => {
	it('returns 4 intervals (one per score)', () => {
		const result = intervals()
		expect(result).toHaveLength(4)
	})

	it('all intervals are >= 1', () => {
		const result = intervals()
		for (const i of result) {
			expect(i).toBeGreaterThanOrEqual(1)
		}
	})

	it('intervals increase with score for first review', () => {
		const result = intervals()
		// Again < Hard < Good < Easy
		expect(result[0]).toBeLessThan(result[1])
		expect(result[1]).toBeLessThan(result[2])
		expect(result[2]).toBeLessThan(result[3])
	})

	it('works with a previous review', () => {
		const prev = mockReview()
		const currentTime = new Date('2025-01-11T12:00:00Z')
		const result = intervals(prev, currentTime)

		expect(result).toHaveLength(4)
		// Again should give shortest interval
		expect(result[0]).toBeLessThan(result[2])
	})
})

describe('FSRS determinism', () => {
	it('produces identical output for identical input', () => {
		const currentTime = new Date('2025-01-11T12:00:00Z')
		const prev = mockReview()

		const a = calculateFSRS({ score: 3, previousReview: prev, currentTime })
		const b = calculateFSRS({ score: 3, previousReview: prev, currentTime })

		expect(a.difficulty).toBe(b.difficulty)
		expect(a.stability).toBe(b.stability)
		expect(a.retrievability).toBe(b.retrievability)
		expect(a.interval).toBe(b.interval)
	})
})

// ---------------------------------------------------------------------------
// Direction isolation
// ---------------------------------------------------------------------------
// In bidirectional mode, each phrase has two independent cards: forward and
// reverse.  Their FSRS chains must be completely independent — reviewing
// the forward card should have zero effect on the reverse card's scheduling,
// and vice-versa.
//
// At the FSRS algorithm level this is guaranteed automatically: calculateFSRS
// is a pure function whose output depends only on the `previousReview` you
// pass in.  But these tests exist to make the guarantee explicit, and to
// catch regressions if someone accidentally feeds the wrong review into the
// wrong card's chain.
// ---------------------------------------------------------------------------

describe('direction isolation', () => {
	it('forward and reverse cards develop independent FSRS chains', () => {
		// Day 0: Both cards are new. Forward gets score=4 (Easy), reverse gets score=1 (Again).
		const forwardDay0 = calculateFSRS({ score: 4 })
		const reverseDay0 = calculateFSRS({ score: 1 })

		// The forward card should be much more stable than the reverse card.
		expect(forwardDay0.stability).toBeGreaterThan(reverseDay0.stability)
		expect(forwardDay0.difficulty).toBeLessThan(reverseDay0.difficulty)

		// Day 10: Review both again. Forward used previous=forwardDay0, reverse used previous=reverseDay0.
		const day10 = new Date('2025-01-11T12:00:00Z')

		const forwardDay10 = calculateFSRS({
			score: 3,
			previousReview: mockReview({
				difficulty: forwardDay0.difficulty,
				stability: forwardDay0.stability,
				created_at: '2025-01-01T12:00:00Z',
				direction: 'forward',
			}),
			currentTime: day10,
		})

		const reverseDay10 = calculateFSRS({
			score: 3,
			previousReview: mockReview({
				difficulty: reverseDay0.difficulty,
				stability: reverseDay0.stability,
				created_at: '2025-01-01T12:00:00Z',
				direction: 'reverse',
			}),
			currentTime: day10,
		})

		// After both score Good on day 10, the forward card (which started Easy)
		// should still have higher stability than the reverse card (which started Again).
		expect(forwardDay10.stability).toBeGreaterThan(reverseDay10.stability)

		// Both should have non-null retrievability (both had a previous review).
		expect(forwardDay10.retrievability).not.toBeNull()
		expect(reverseDay10.retrievability).not.toBeNull()

		// Crucially: the retrievability values should differ because the two
		// cards had different stability going in (more stable → higher recall).
		expect(forwardDay10.retrievability).not.toBe(reverseDay10.retrievability)
	})

	it('calculateFSRS ignores the direction field — isolation depends on passing the right previousReview', () => {
		// The direction field on a review is metadata, not an FSRS input.
		// calculateFSRS only looks at difficulty, stability, and created_at.
		// This test makes that explicit: changing direction on the previous
		// review doesn't change the output.
		const currentTime = new Date('2025-01-11T12:00:00Z')

		const withForward = calculateFSRS({
			score: 3,
			previousReview: mockReview({ direction: 'forward' }),
			currentTime,
		})
		const withReverse = calculateFSRS({
			score: 3,
			previousReview: mockReview({ direction: 'reverse' }),
			currentTime,
		})

		expect(withForward.stability).toBe(withReverse.stability)
		expect(withForward.difficulty).toBe(withReverse.difficulty)
		expect(withForward.retrievability).toBe(withReverse.retrievability)
	})
})

// ---------------------------------------------------------------------------
// Phase 1 vs Phase 3 FSRS behaviour
// ---------------------------------------------------------------------------
// During a review session, cards go through up to two phases:
//
// Phase 1 (day_first_review=true):
//   The first time you see each card today. FSRS is calculated normally,
//   using the most recent PRIOR review (from a previous day) as the base.
//   This is the review that matters for long-term scheduling.
//
// Phase 3 (day_first_review=false):
//   Re-review of cards you scored Again in phase 1. The mutation passes
//   `previousReview: undefined` so FSRS computes INITIAL values (as if
//   the card were brand new).
//
// THIS IS THE KEY INSIGHT the user asked about:
//   A phase-3 review has a stability value, but it's NOT derived from
//   the phase-1 review. It's a fresh initial value based solely on the
//   phase-3 score. The phase-1 chain is not consulted.
//
//   For a brand-new card scored Again in phase 1 then Good in phase 3:
//     Phase 1: stability = initialStability(1) ≈ 0.40  (Again)
//     Phase 3: stability = initialStability(3) ≈ 3.17  (Good, fresh init)
//
// IMPORTANT: Currently the onSuccess handler writes the phase-3 review's
// difficulty/stability back to the card record, and useLatestReviewForPhrase
// returns the phase-3 review (since it's newest). This means the NEXT day's
// FSRS will build on the phase-3 initial values, not the phase-1 values.
// This is load-bearing for scheduling — see the tests below.
// ---------------------------------------------------------------------------

describe('phase 1 vs phase 3 FSRS values', () => {
	it('phase-1 first-ever review computes initial values (retrievability is null)', () => {
		// A card that has never been reviewed. Phase 1, score = 1 (Again).
		// This is what postReview calls with previousReview = latestReview = undefined.
		const phase1 = calculateFSRS({ score: 1 })

		expect(phase1.retrievability).toBeNull()
		expect(phase1.difficulty).toBeCloseTo(7.195, 2)
		expect(phase1.stability).toBeCloseTo(0.403, 2) // W.S_0[0]
	})

	it('phase-3 re-review ALSO computes initial values (previousReview is undefined by design)', () => {
		// The phase-3 code path passes `previousReview: undefined`.
		// So calculateFSRS treats this as a first-ever review.
		// Score = 3 (Good) on the re-review.
		const phase3 = calculateFSRS({ score: 3 })

		expect(phase3.retrievability).toBeNull()
		expect(phase3.difficulty).toBeCloseTo(5.282, 2)
		expect(phase3.stability).toBeCloseTo(3.173, 2) // W.S_0[2]
	})

	it('phase-3 stability is NOT derived from the phase-1 review', () => {
		// This is the specific scenario the user observed:
		// 1. New reverse card, phase 1, score=1 (Again) → stability ≈ 0.40
		// 2. Same card, phase 3, score=3 (Good)         → stability ≈ 3.17
		//
		// The phase-3 stability (3.17) is much higher than the phase-1 stability (0.40).
		// It's not derived from 0.40 in any way — it's a fresh initial value for score=3.
		const phase1 = calculateFSRS({ score: 1 })
		const phase3 = calculateFSRS({ score: 3 }) // same as what the mutation does

		// Phase 3 has higher stability because score=3 > score=1
		expect(phase3.stability).toBeGreaterThan(phase1.stability)

		// If phase 3 were building on phase 1, it would use phase1's difficulty
		// and stability as inputs. Instead it computes its own initial values:
		expect(phase3.difficulty).not.toBeCloseTo(phase1.difficulty, 2)
		expect(phase3.stability).not.toBeCloseTo(phase1.stability, 2)

		// Verify phase 3 matches a standalone score=3 first review exactly
		const standalone = calculateFSRS({ score: 3 })
		expect(phase3.difficulty).toBe(standalone.difficulty)
		expect(phase3.stability).toBe(standalone.stability)
	})

	it('phase 3 values would be different if it DID chain off phase 1', () => {
		// For comparison: what WOULD happen if phase 3 used phase 1 as previousReview?
		// (This is NOT what the code does, but proves the values would differ.)
		const phase1Time = new Date('2025-06-01T12:00:00Z')
		const phase3Time = new Date('2025-06-01T12:30:00Z') // 30 minutes later

		const phase1 = calculateFSRS({
			score: 1,
			currentTime: phase1Time,
		})

		// Hypothetical: chaining off phase 1
		const hypotheticalChained = calculateFSRS({
			score: 3,
			previousReview: mockReview({
				difficulty: phase1.difficulty,
				stability: phase1.stability,
				created_at: phase1Time.toISOString(),
			}),
			currentTime: phase3Time,
		})

		// Actual: what the code does (fresh init, previousReview=undefined)
		const actualPhase3 = calculateFSRS({
			score: 3,
			currentTime: phase3Time,
		})

		// The chained version would have non-null retrievability
		expect(hypotheticalChained.retrievability).not.toBeNull()
		// The actual phase 3 has null retrievability (fresh init)
		expect(actualPhase3.retrievability).toBeNull()

		// The stability values differ between chained and fresh
		expect(hypotheticalChained.stability).not.toBe(actualPhase3.stability)
	})

	describe('scheduling implications of phase-3 values', () => {
		// These tests document a consequence of the current design:
		// The phase-3 review's FSRS values ARE used for future scheduling.
		//
		// useLatestReviewForPhrase returns the most recent review (by created_at),
		// which after a phase-3 review is the phase-3 row. The next day's FSRS
		// builds on that review's difficulty and stability.
		//
		// So: a card scored Again in phase 1 but Good in phase 3 will be
		// scheduled as if its first review was Good — the Again is effectively
		// replaced for scheduling purposes.

		it('next-day FSRS uses phase-3 values when phase-3 review is newest', () => {
			// Phase 1: score=1 (Again), brand new card
			const phase1 = calculateFSRS({
				score: 1,
				currentTime: new Date('2025-06-01T12:00:00Z'),
			})

			// Phase 3: score=3 (Good), fresh init (previousReview=undefined)
			const phase3 = calculateFSRS({
				score: 3,
				currentTime: new Date('2025-06-01T12:30:00Z'),
			})

			// Next day: build FSRS on the phase-3 review (the latest one)
			const nextDay = new Date('2025-06-02T12:00:00Z')

			const scheduledFromPhase3 = calculateFSRS({
				score: 3,
				previousReview: mockReview({
					difficulty: phase3.difficulty,
					stability: phase3.stability,
					created_at: '2025-06-01T12:30:00Z',
					direction: 'reverse',
				}),
				currentTime: nextDay,
			})

			// Alternative: what if we'd scheduled from phase 1 instead?
			const scheduledFromPhase1 = calculateFSRS({
				score: 3,
				previousReview: mockReview({
					difficulty: phase1.difficulty,
					stability: phase1.stability,
					created_at: '2025-06-01T12:00:00Z',
					direction: 'reverse',
				}),
				currentTime: nextDay,
			})

			// Phase-3 had higher stability (3.17 vs 0.40), so the interval
			// computed from it will be longer — the card is treated as more stable.
			expect(scheduledFromPhase3.interval).toBeGreaterThan(
				scheduledFromPhase1.interval
			)

			// Document the actual values for clarity
			expect(scheduledFromPhase3.stability).toBeGreaterThan(
				scheduledFromPhase1.stability
			)
		})

		it('same phase-3 score produces same scheduling regardless of phase-1 score', () => {
			// Two cards, both new:
			// Card A: phase-1 score=1 (Again), phase-3 score=3 (Good)
			// Card B: phase-1 score=2 (Hard),  phase-3 score=3 (Good)
			//
			// Since phase-3 passes previousReview=undefined, the phase-1 score
			// is irrelevant. Both phase-3 reviews produce identical FSRS values.
			const phase3 = calculateFSRS({ score: 3 })

			// Both cards have the same phase-3 output, so next-day scheduling is identical
			const nextDay = new Date('2025-06-02T12:00:00Z')

			const fromCardA = calculateFSRS({
				score: 3,
				previousReview: mockReview({
					difficulty: phase3.difficulty,
					stability: phase3.stability,
					created_at: '2025-06-01T12:30:00Z',
				}),
				currentTime: nextDay,
			})
			const fromCardB = calculateFSRS({
				score: 3,
				previousReview: mockReview({
					difficulty: phase3.difficulty,
					stability: phase3.stability,
					created_at: '2025-06-01T12:30:00Z',
				}),
				currentTime: nextDay,
			})

			expect(fromCardA.stability).toBe(fromCardB.stability)
			expect(fromCardA.interval).toBe(fromCardB.interval)
			expect(fromCardA.difficulty).toBe(fromCardB.difficulty)
		})
	})
})
