import { describe, expect, it } from 'vitest'
import { HOUR, leftThisHour } from './hourly'

describe('leftThisHour', () => {
	const at = Date.parse('2026-10-30T12:00:00Z')

	it('counts what was made in the hour before `at`', () => {
		const since: Array<string> = []
		const left = leftThisHour(
			12,
			(time) => {
				since.push(time)
				return 5
			},
			at
		)
		expect(left).toBe(7)
		expect(since).toEqual([new Date(at - HOUR).toISOString()])
	})

	it('never goes below zero', () => {
		expect(leftThisHour(12, () => 20, at)).toBe(0)
	})
})
