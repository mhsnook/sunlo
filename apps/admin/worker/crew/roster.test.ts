import { describe, expect, it } from 'vitest'
import {
	crew,
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

	it('seats command-2 with command-1 in the Command room, the principal first', () => {
		expect(roomOf('command-2')).toBe('command')
		expect(principalOf('command')).toBe('command-1')
		expect(roomMembers('command')).toEqual(['command-1', 'command-2'])
		expect(roomMembers('product')).toEqual(['product-1'])
	})

	it('puts the rank before the name', () => {
		const { rank, name } = crew['command-1']
		expect(displayName('command-1')).toBe(`${rank} ${name}`)
		expect(displayName('command-2')).toBe('Data')
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
		expect(PlaceSchema.safeParse('room:command-1').success).toBe(false)
	})
})
