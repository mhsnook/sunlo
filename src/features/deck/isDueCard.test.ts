import { describe, it, expect } from 'vitest'
import { isDueCard } from '@/features/deck/is-due-card'
import type { CardMetaType } from '@/features/deck/schemas'

function mockCard(overrides: Partial<CardMetaType> = {}): CardMetaType {
	return {
		id: '550e8400-e29b-41d4-a716-446655440000',
		created_at: '2026-01-01T00:00:00Z',
		phrase_id: '550e8400-e29b-41d4-a716-446655440001',
		uid: '550e8400-e29b-41d4-a716-446655440002',
		lang: 'hin',
		status: 'active',
		direction: 'forward',
		updated_at: '2026-01-01T00:00:00Z',
		last_reviewed_at: new Date(
			Date.now() - 30 * 24 * 60 * 60 * 1000
		).toISOString(),
		difficulty: 5.0,
		stability: 10.0,
		...overrides,
	}
}

describe('isDueCard', () => {
	it('returns true when retrievability has dropped below 0.9', () => {
		// Reviewed 30 days ago with stability 10 → retrievability ≈ 0.64
		expect(isDueCard(mockCard())).toBe(true)
	})

	it('returns false when recently reviewed (high retrievability)', () => {
		// Reviewed just now → retrievability ≈ 1.0
		expect(
			isDueCard(mockCard({ last_reviewed_at: new Date().toISOString() }))
		).toBe(false)
	})

	it('returns false for inactive cards', () => {
		expect(isDueCard(mockCard({ status: 'learned' }))).toBe(false)
		expect(isDueCard(mockCard({ status: 'skipped' }))).toBe(false)
	})

	it('returns false when never reviewed (no last_reviewed_at)', () => {
		expect(isDueCard(mockCard({ last_reviewed_at: null }))).toBe(false)
	})

	it('returns false when stability is null', () => {
		expect(isDueCard(mockCard({ stability: null }))).toBe(false)
	})

	it('returns true at exactly the stability boundary', () => {
		// At t = stability, retrievability ≈ 0.9 — right at the threshold
		const stability = 10
		const reviewed = new Date(
			Date.now() - stability * 24 * 60 * 60 * 1000
		).toISOString()
		expect(isDueCard(mockCard({ stability, last_reviewed_at: reviewed }))).toBe(
			true
		)
	})

	it('returns false just before the stability boundary', () => {
		// At t = stability * 0.8, retrievability ≈ 0.92 — not yet due
		const stability = 10
		const reviewed = new Date(
			Date.now() - stability * 0.8 * 24 * 60 * 60 * 1000
		).toISOString()
		expect(isDueCard(mockCard({ stability, last_reviewed_at: reviewed }))).toBe(
			false
		)
	})
})
