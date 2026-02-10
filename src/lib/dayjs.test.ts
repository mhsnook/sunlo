import { describe, it, expect } from 'vitest'
import { formatInterval } from './dayjs'

describe('formatInterval', () => {
	it('formats days under 14 as days', () => {
		expect(formatInterval(0)).toBe('0d')
		expect(formatInterval(1)).toBe('1d')
		expect(formatInterval(7)).toBe('7d')
		expect(formatInterval(13)).toBe('13d')
	})

	it('formats 14+ days as weeks', () => {
		expect(formatInterval(14)).toBe('2w')
		expect(formatInterval(21)).toBe('3w')
		expect(formatInterval(28)).toBe('4w')
	})

	it('rounds weeks', () => {
		expect(formatInterval(16)).toBe('2w')
		expect(formatInterval(18)).toBe('3w')
	})

	it('formats 60+ days as months', () => {
		expect(formatInterval(60)).toBe('2mo')
		expect(formatInterval(90)).toBe('3mo')
		expect(formatInterval(120)).toBe('4mo')
	})

	it('formats 365+ days as years', () => {
		expect(formatInterval(365)).toBe('1yr')
		expect(formatInterval(730)).toBe('2yr')
	})

	it('rounds fractional days', () => {
		expect(formatInterval(1.4)).toBe('1d')
		expect(formatInterval(1.6)).toBe('2d')
	})

	it('handles boundary at 14 days', () => {
		expect(formatInterval(13.4)).toBe('13d')
		expect(formatInterval(13.6)).toBe('2w')
	})

	it('handles boundary at 60 days', () => {
		expect(formatInterval(59.4)).toBe('8w')
		expect(formatInterval(59.6)).toBe('2mo')
	})

	it('handles boundary at 365 days', () => {
		expect(formatInterval(364.4)).toBe('12mo')
		expect(formatInterval(365.4)).toBe('1yr')
	})
})
