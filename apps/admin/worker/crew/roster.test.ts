import { describe, expect, it } from 'vitest'
import {
	crewList,
	displayName,
	leadKeys,
	leadOf,
	PlaceSchema,
	placeOf,
	roomMembers,
	roomOf,
} from '../../shared/crew'

describe('the roster', () => {
	it('lists exactly the members whose role is lead as leads', () => {
		expect(
			crewList.filter((member) => member.role === 'lead').map((m) => m.key)
		).toEqual([...leadKeys])
	})

	it('seats Data in the Command room', () => {
		expect(roomOf('data')).toBe('riker')
		expect(roomMembers('riker')).toEqual(['riker', 'data'])
		expect(roomMembers('product')).toEqual(['product'])
	})

	it('puts the rank before the name', () => {
		expect(displayName('riker')).toBe('Cmdr Riker')
		expect(displayName('library')).toBe('Lt Cmdr Library')
		expect(displayName('data')).toBe('Data')
	})
})

describe('places', () => {
	it('round-trips a lead through its place', () => {
		for (const lead of leadKeys) expect(leadOf(placeOf(lead))).toBe(lead)
		expect(leadOf('room')).toBeNull()
	})

	it('refuses the places from before rooms', () => {
		expect(PlaceSchema.safeParse('room:product').success).toBe(true)
		expect(PlaceSchema.safeParse('bridge').success).toBe(false)
		expect(PlaceSchema.safeParse('room:data').success).toBe(false)
	})
})
