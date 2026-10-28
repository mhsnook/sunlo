import { describe, expect, it } from 'vitest'
import { sitrepContext } from './sitrep'

const line = (agent: 'riker' | 'geordi', track: string, text: string) => ({
	agent,
	track,
	text,
	by: agent,
	byName: agent === 'riker' ? 'Riker' : 'Geordi',
	at: '2026-10-27T14:02:00Z',
})

describe('sitrepContext', () => {
	it('starts with Riker’s note, then every track in roster order', () => {
		const text = sitrepContext(
			[
				line('geordi', 'Engineering', 'Moving reviews to the new index.'),
				line('riker', 'Note', 'Retention first this month.'),
			],
			(iso) => iso
		)
		expect(text).toContain(
			"Riker's note: Retention first this month. (Riker, 2026-10-27T14:02:00Z)"
		)
		const product = text.indexOf('- Geordi, Product:')
		const engineering = text.indexOf('- Geordi, Engineering:')
		const retention = text.indexOf('- Guinan, Retention:')
		expect(product).toBeGreaterThan(text.indexOf("Riker's note"))
		expect(engineering).toBeGreaterThan(product)
		expect(retention).toBeGreaterThan(engineering)
	})

	it('marks an empty track instead of leaving it out', () => {
		const text = sitrepContext([], (iso) => iso)
		expect(text).toContain("Riker's note: (no report yet)")
		expect(text).toContain('- Geordi, Engineering: (no report yet)')
	})

	it('leaves out Data, who keeps no lines', () => {
		expect(sitrepContext([], (iso) => iso)).not.toContain('Data')
	})
})
