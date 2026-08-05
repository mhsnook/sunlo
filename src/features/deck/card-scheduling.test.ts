import { describe, it, expect } from 'vitest'
import {
	schedulingFromReviews,
	NO_SCHEDULING,
} from '@/features/deck/card-scheduling'
import type { CardReviewType } from '@/features/review/schemas'

const review = (
	overrides: Partial<CardReviewType> & { created_at: string; stage: number }
): CardReviewType => ({
	id: 'aa550001-1111-4aaa-bbbb-333333333333',
	uid: 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
	day_session: '2026-08-05',
	lang: 'kan',
	phrase_id: 'aa110001-1111-4aaa-bbbb-cccccccccccc',
	direction: 'forward',
	score: 3,
	difficulty: 5,
	stability: 3,
	review_time_retrievability: null,
	...overrides,
})

describe('schedulingFromReviews', () => {
	it('reads the latest scoring review', () => {
		const result = schedulingFromReviews([
			review({ created_at: '2026-08-01T10:00:00Z', stage: 1, difficulty: 4 }),
			review({ created_at: '2026-08-03T10:00:00Z', stage: 2, difficulty: 6 }),
			review({ created_at: '2026-08-02T10:00:00Z', stage: 1, difficulty: 5 }),
		])
		expect(result.last_reviewed_at).toBe('2026-08-03T10:00:00Z')
		expect(result.difficulty).toBe(6)
	})

	it('ignores again-round rows, which carry null FSRS values', () => {
		const result = schedulingFromReviews([
			review({ created_at: '2026-08-01T10:00:00Z', stage: 1, stability: 7 }),
			review({
				created_at: '2026-08-04T10:00:00Z',
				stage: 3,
				difficulty: null,
				stability: null,
			}),
		])
		expect(result.last_reviewed_at).toBe('2026-08-01T10:00:00Z')
		expect(result.stability).toBe(7)
	})

	it('reports a card with no reviews as never practised', () => {
		expect(schedulingFromReviews([])).toEqual(NO_SCHEDULING)
	})

	it('reports a card with only again-round rows as never practised', () => {
		const result = schedulingFromReviews([
			review({ created_at: '2026-08-04T10:00:00Z', stage: 3 }),
		])
		expect(result).toEqual(NO_SCHEDULING)
	})
})

describe('schedulingFromReviews with no list', () => {
	it('reports never practised rather than throwing', () => {
		expect(schedulingFromReviews(undefined)).toEqual(NO_SCHEDULING)
		expect(schedulingFromReviews(null)).toEqual(NO_SCHEDULING)
	})
})
