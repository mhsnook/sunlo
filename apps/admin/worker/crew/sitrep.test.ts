import { describe, expect, it } from 'vitest'
import { sitrepContext } from './sitrep'

describe('sitrepContext', () => {
	it('gives the whole report, then who last wrote it', () => {
		const text = sitrepContext(
			{
				text: 'Retention first this month.\n\n**Product room**: onboarding.',
				by: 'riker',
				byName: 'Cmdr Riker',
				at: '2026-10-27T14:02:00Z',
			},
			(iso) => iso
		)
		expect(text).toBe(
			'## The Situation Report: where Sunlo and each room stand now\n\nRetention first this month.\n\n**Product room**: onboarding.\n\n(Last written by Cmdr Riker, 2026-10-27T14:02:00Z.)'
		)
	})

	it('says so when nobody has written it', () => {
		expect(sitrepContext(null, (iso) => iso)).toContain(
			'(Nobody has written it yet.)'
		)
	})
})
