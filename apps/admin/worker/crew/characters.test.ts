import { describe, expect, it } from 'vitest'
import { defaultCharacter } from '../../shared/characters'
import { crew, crewKeys, displayName } from '../../shared/crew'

describe('defaultCharacter', () => {
	it('gives every active seat a persona that names it, and none to the rest', () => {
		for (const key of crewKeys) {
			const character = defaultCharacter(key)
			if (crew[key].active) {
				expect(character).toContain(`You are ${displayName(key)}`)
			} else {
				expect(character).toBeNull()
			}
		}
	})
})
