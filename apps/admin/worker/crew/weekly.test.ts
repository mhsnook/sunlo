import { describe, expect, it } from 'vitest'
import { briefDue } from './weekly'

const weekly = { briefAt: null, meetingAt: null, timezone: 'America/New_York' }

describe('briefDue', () => {
	it('is due at 04:00 on Sunday in the admin’s time zone', () => {
		// Sunday Oct 25 2026, 04:00 in New York (EDT, UTC-4).
		expect(briefDue(new Date('2026-10-25T08:00:00Z'), weekly)).toBe(true)
	})

	it('follows daylight saving: 04:00 EST is 09:00 UTC', () => {
		// Sunday Nov 8 2026, after the switch to EST (UTC-5).
		expect(briefDue(new Date('2026-11-08T08:00:00Z'), weekly)).toBe(false)
		expect(briefDue(new Date('2026-11-08T09:00:00Z'), weekly)).toBe(true)
	})

	it('uses the zone the admin set, such as Kolkata', () => {
		const kolkata = { ...weekly, timezone: 'Asia/Kolkata' }
		// The hourly cron runs at :00 UTC, which is :30 in Kolkata, so the run
		// in the 04:00 hour there is Saturday 23:00 UTC (04:30 IST).
		expect(briefDue(new Date('2026-10-24T23:00:00Z'), kolkata)).toBe(true)
	})

	it('is not due at other hours, or twice in one Sunday', () => {
		expect(briefDue(new Date('2026-10-25T09:00:00Z'), weekly)).toBe(false)
		expect(
			briefDue(new Date('2026-10-25T08:00:00Z'), {
				...weekly,
				briefAt: '2026-10-25T08:00:05Z',
			})
		).toBe(false)
	})
})
