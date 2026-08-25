import { describe, it, expect } from 'vitest'
import { findChainPredecessor, findLastSighting } from './review-utils'
import { calculateFSRS } from './fsrs'
import type { CardReviewType } from './schemas'

const P1 = 'aa110001-1111-4aaa-bbbb-cccccccccccc'

const review = (
	overrides: Partial<CardReviewType> & { day_session: string; stage: number }
): CardReviewType => ({
	id: crypto.randomUUID(),
	created_at: `${overrides.day_session}T10:00:00Z`,
	uid: 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
	lang: 'kan',
	phrase_id: P1,
	direction: 'forward',
	score: 3,
	difficulty: 5,
	stability: 10,
	review_time_retrievability: null,
	...overrides,
})

// A session where the user scored the card, then re-read it before finishing.
const scored = review({
	day_session: '2026-08-01',
	stage: 1,
	created_at: '2026-08-01T10:00:00Z',
})
const reRead = review({
	day_session: '2026-08-01',
	stage: 3,
	created_at: '2026-08-01T10:40:00Z',
	difficulty: null,
	stability: null,
})

describe('findLastSighting', () => {
	it('prefers a later re-read over the scoring review it followed', () => {
		const found = findLastSighting(
			[scored, reRead],
			P1,
			'forward',
			'2026-08-05'
		)
		expect(found?.created_at).toBe('2026-08-01T10:40:00Z')
		expect(found?.stage).toBe(3)
	})

	it('excludes the session being scored, same as the chain predecessor', () => {
		expect(
			findLastSighting([scored, reRead], P1, 'forward', '2026-08-01')
		).toBeUndefined()
	})

	it('ignores other phrases and the reverse direction', () => {
		const otherPhrase = review({
			day_session: '2026-08-02',
			stage: 3,
			phrase_id: 'bb110001-1111-4aaa-bbbb-cccccccccccc',
		})
		const reverse = review({
			day_session: '2026-08-02',
			stage: 3,
			direction: 'reverse',
		})
		const found = findLastSighting(
			[scored, otherPhrase, reverse],
			P1,
			'forward',
			'2026-08-05'
		)
		expect(found?.created_at).toBe('2026-08-01T10:00:00Z')
	})

	it('returns a different row than the chain predecessor after a re-read', () => {
		const reviews = [scored, reRead]
		const sighting = findLastSighting(reviews, P1, 'forward', '2026-08-05')
		const predecessor = findChainPredecessor(
			reviews,
			P1,
			'forward',
			'2026-08-05'
		)
		expect(sighting?.id).not.toBe(predecessor?.id)
		expect(predecessor?.stage).toBe(1)
	})
})

describe('calculateFSRS interval start', () => {
	const now = new Date('2026-08-05T10:00:00Z')

	it('decays from the last sighting, not the scoring review', () => {
		// Scored on the 1st, re-read on the 3rd: 2 days of decay, not 4.
		const fromScoring = calculateFSRS({
			score: 3,
			previousReview: scored,
			currentTime: now,
		})
		const fromSighting = calculateFSRS({
			score: 3,
			previousReview: scored,
			lastSeenAt: '2026-08-03T10:00:00Z',
			currentTime: now,
		})
		expect(fromSighting.retrievability).toBeGreaterThan(
			fromScoring.retrievability!
		)
	})

	it('takes difficulty and stability from the scoring review either way', () => {
		const result = calculateFSRS({
			score: 3,
			previousReview: scored,
			lastSeenAt: reRead.created_at,
			currentTime: now,
		})
		// reRead carries null FSRS values; they must not reach the calculation.
		expect(result.difficulty).not.toBeNull()
		expect(result.stability).toBeGreaterThan(0)
	})

	it('falls back to the scoring review when no sighting is given', () => {
		const explicit = calculateFSRS({
			score: 3,
			previousReview: scored,
			lastSeenAt: scored.created_at,
			currentTime: now,
		})
		const implicit = calculateFSRS({
			score: 3,
			previousReview: scored,
			currentTime: now,
		})
		expect(implicit.retrievability).toBe(explicit.retrievability)
		expect(implicit.stability).toBe(explicit.stability)
	})

	it('ignores the sighting on a card with no prior FSRS state', () => {
		const result = calculateFSRS({
			score: 3,
			lastSeenAt: '2026-08-03T10:00:00Z',
			currentTime: now,
		})
		expect(result.retrievability).toBeNull()
	})
})
