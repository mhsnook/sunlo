import { describe, it, expect } from 'vitest'
import {
	calculateFSRS,
	validateFSRSValues,
	intervals,
	retrievability,
	type Score,
	type FSRSOutput,
} from './fsrs'
import type { CardReviewType } from './schemas'

// Helper to make a mock previous review
function mockReview(
	overrides: Partial<CardReviewType> = {}
): CardReviewType {
	return {
		id: '00000000-0000-0000-0000-000000000001',
		created_at: '2025-01-01T12:00:00Z',
		uid: '00000000-0000-0000-0000-000000000002',
		day_session: '2025-01-01',
		lang: 'hin',
		phrase_id: '00000000-0000-0000-0000-000000000003',
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
				expect(results[i].stability).toBeGreaterThan(
					results[i - 1].stability
				)
			}
		})

		it('produces decreasing difficulty with higher scores', () => {
			const results = ([1, 2, 3, 4] as Score[]).map((score) =>
				calculateFSRS({ score })
			)

			for (let i = 1; i < results.length; i++) {
				expect(results[i].difficulty).toBeLessThan(
					results[i - 1].difficulty
				)
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
