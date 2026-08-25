import { describe, it, expect } from 'vitest'
import { isDueCard } from '@/features/deck/is-due-card'
import type { CardScheduling } from '@/features/deck/card-scheduling'

const daysAgo = (days: number): string =>
	new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

function mockScheduling(
	overrides: Partial<CardScheduling> = {}
): CardScheduling {
	return {
		last_reviewed_at: daysAgo(30),
		difficulty: 5.0,
		stability: 10.0,
		...overrides,
	}
}

describe('isDueCard', () => {
	it('returns true when retrievability has dropped below 0.9', () => {
		// Reviewed 30 days ago with stability 10 → retrievability ≈ 0.64
		expect(isDueCard({ status: 'active' }, mockScheduling())).toBe(true)
	})

	it('returns false when recently reviewed (high retrievability)', () => {
		// Reviewed just now → retrievability ≈ 1.0
		expect(
			isDueCard(
				{ status: 'active' },
				mockScheduling({ last_reviewed_at: new Date().toISOString() })
			)
		).toBe(false)
	})

	it('returns false for inactive cards', () => {
		expect(isDueCard({ status: 'learned' }, mockScheduling())).toBe(false)
		expect(isDueCard({ status: 'skipped' }, mockScheduling())).toBe(false)
	})

	it('returns false when never reviewed (no last_reviewed_at)', () => {
		expect(
			isDueCard(
				{ status: 'active' },
				mockScheduling({ last_reviewed_at: null })
			)
		).toBe(false)
	})

	it('returns false when stability is null', () => {
		expect(
			isDueCard({ status: 'active' }, mockScheduling({ stability: null }))
		).toBe(false)
	})

	// A card whose reviews have not arrived yet reads as not-due rather than
	// as never-practised — see `schedulingFromReviews`.
	it('returns false when scheduling is still pending', () => {
		expect(isDueCard({ status: 'active' }, null)).toBe(false)
	})

	it('returns true at exactly the stability boundary', () => {
		// At t = stability, retrievability ≈ 0.9 — right at the threshold
		const stability = 10
		expect(
			isDueCard(
				{ status: 'active' },
				mockScheduling({ stability, last_reviewed_at: daysAgo(stability) })
			)
		).toBe(true)
	})

	it('returns false just before the stability boundary', () => {
		// At t = stability * 0.8, retrievability ≈ 0.92 — not yet due
		const stability = 10
		expect(
			isDueCard(
				{ status: 'active' },
				mockScheduling({
					stability,
					last_reviewed_at: daysAgo(stability * 0.8),
				})
			)
		).toBe(false)
	})
})
