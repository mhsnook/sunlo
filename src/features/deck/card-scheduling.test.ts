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
		expect(result?.last_reviewed_at).toBe('2026-08-03T10:00:00Z')
		expect(result?.difficulty).toBe(6)
	})

	it('reports a card with no reviews as never practised', () => {
		expect(schedulingFromReviews([])).toEqual(NO_SCHEDULING)
	})
})

// The two halves of the answer come from different rows. Getting this backwards
// either freezes the decay clock at the last scoring review, or blanks the
// card's FSRS state the moment the user re-reads it inside a session.
describe('schedulingFromReviews across review phases', () => {
	const scoring = review({
		created_at: '2026-08-01T10:00:00Z',
		stage: 1,
		difficulty: 4,
		stability: 7,
	})
	const againRound = review({
		created_at: '2026-08-01T10:20:00Z',
		stage: 3,
		difficulty: null,
		stability: null,
	})

	it('dates the last review from any phase, re-reads included', () => {
		const result = schedulingFromReviews([scoring, againRound])
		expect(result?.last_reviewed_at).toBe('2026-08-01T10:20:00Z')
	})

	it('keeps FSRS values from the scoring review the re-read followed', () => {
		const result = schedulingFromReviews([scoring, againRound])
		expect(result?.difficulty).toBe(4)
		expect(result?.stability).toBe(7)
	})

	it('reports FSRS as unknown when only again-round rows exist', () => {
		const result = schedulingFromReviews([againRound])
		expect(result?.last_reviewed_at).toBe('2026-08-01T10:20:00Z')
		expect(result?.difficulty).toBeNull()
		expect(result?.stability).toBeNull()
	})

	it('takes FSRS from the newest scoring review, not the newest row', () => {
		const older = review({
			created_at: '2026-08-01T10:00:00Z',
			stage: 1,
			difficulty: 4,
		})
		const newer = review({
			created_at: '2026-08-05T10:00:00Z',
			stage: 1,
			difficulty: 9,
		})
		const result = schedulingFromReviews([older, newer, againRound])
		expect(result?.difficulty).toBe(9)
		expect(result?.last_reviewed_at).toBe('2026-08-05T10:00:00Z')
	})
})

describe('schedulingFromReviews with no list', () => {
	// A pending include is null, and an empty history is NO_SCHEDULING.
	// Collapsing the two reports every card as never practised for the frame it
	// enters the query.
	it('reports pending rather than never practised', () => {
		expect(schedulingFromReviews(undefined)).toBeNull()
		expect(schedulingFromReviews(null)).toBeNull()
	})
})
