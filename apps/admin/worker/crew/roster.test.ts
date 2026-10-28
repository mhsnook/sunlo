import { describe, expect, it } from 'vitest'
import {
	crewList,
	displayName,
	PlaceSchema,
	placeOf,
	principalOf,
	roomKeys,
	roomMembers,
	roomOf,
	roomOfPlace,
} from '../../shared/crew'

describe('the roster', () => {
	it('gives every room exactly one principal', () => {
		for (const room of roomKeys) {
			const principals = crewList.filter(
				(member) => member.room === room && member.role === 'principal'
			)
			expect(principals).toHaveLength(1)
		}
	})

	it('seats Data with Riker in the Command room, Riker first', () => {
		expect(roomOf('data')).toBe('command')
		expect(principalOf('command')).toBe('riker')
		expect(roomMembers('command')).toEqual(['riker', 'data'])
		expect(roomMembers('product')).toEqual(['geordi'])
	})

	it('puts the rank before the name', () => {
		expect(displayName('riker')).toBe('Cmdr Riker')
		expect(displayName('data')).toBe('Data')
	})
})

describe('places', () => {
	it('round-trips a room through its place', () => {
		for (const room of roomKeys) expect(roomOfPlace(placeOf(room))).toBe(room)
		expect(roomOfPlace('room')).toBeNull()
	})

	it('refuses the places from before rooms', () => {
		expect(PlaceSchema.safeParse('room:product').success).toBe(true)
		expect(PlaceSchema.safeParse('bridge').success).toBe(false)
		expect(PlaceSchema.safeParse('room:riker').success).toBe(false)
	})
})
