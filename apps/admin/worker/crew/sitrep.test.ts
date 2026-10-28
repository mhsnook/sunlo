import { describe, expect, it } from 'vitest'
import type { RoomKey } from '../../shared/crew'
import { sitrepContext } from './sitrep'

const line = (room: RoomKey, text: string, byName: string) => ({
	room,
	text,
	by: byName.toLowerCase(),
	byName,
	at: '2026-10-27T14:02:00Z',
})

describe('sitrepContext', () => {
	it('starts with Riker’s note, then every room in order', () => {
		const text = sitrepContext(
			[
				line('product', 'Moving reviews to the new index.', 'Geordi'),
				line('command', 'Retention first this month.', 'Riker'),
			],
			(iso) => iso
		)
		expect(text).toContain(
			"Riker's note, for the Command room: Retention first this month. (Riker, 2026-10-27T14:02:00Z)"
		)
		const product = text.indexOf('- Product room: Moving reviews')
		const library = text.indexOf('- Library room:')
		const learnership = text.indexOf('- Learnership room:')
		expect(product).toBeGreaterThan(text.indexOf("Riker's note"))
		expect(library).toBeGreaterThan(product)
		expect(learnership).toBeGreaterThan(library)
	})

	it('marks an empty room instead of leaving it out', () => {
		const text = sitrepContext([], (iso) => iso)
		expect(text).toContain(
			"Riker's note, for the Command room: (no report yet)"
		)
		expect(text).toContain('- Library room: (no report yet)')
	})

	it('lists the Command room once, as the note', () => {
		expect(sitrepContext([], (iso) => iso)).not.toContain('- Command room')
	})
})
