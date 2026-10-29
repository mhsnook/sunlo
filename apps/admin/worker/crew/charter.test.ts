import { describe, expect, it } from 'vitest'
import { answeredEntry, CHARTER_ACTIONS, editedEntry } from './charter'

const at = '2026-10-29T09:00:00Z'

describe('answering a proposed charter entry', () => {
	it('offers Keep it and Not quite', () => {
		expect(CHARTER_ACTIONS.map((action) => action.id)).toEqual([
			'keep',
			'not-quite',
		])
	})

	it('keeps the entry only for Keep it, and stamps when', () => {
		expect(answeredEntry('keep', at)).toEqual({ status: 'kept', keptAt: at })
	})

	it('drops it for Not quite and for a dismissal', () => {
		for (const actionId of ['not-quite', 'dismiss']) {
			expect(answeredEntry(actionId, at)).toEqual({
				status: 'dropped',
				keptAt: null,
			})
		}
	})
})

describe('editing a charter entry in the room log', () => {
	const kept = {
		text: 'Retention before growth.',
		status: 'kept' as const,
		keptAt: '2026-10-20T10:05:00Z',
	}

	it('changes the text and keeps the entry as it was', () => {
		expect(editedEntry(kept, { text: 'Retention first.' }, at)).toEqual({
			...kept,
			text: 'Retention first.',
		})
	})

	it('stamps the time when the admin keeps a proposed entry', () => {
		expect(
			editedEntry(
				{ ...kept, status: 'proposed', keptAt: null },
				{ status: 'kept' },
				at
			)
		).toMatchObject({ status: 'kept', keptAt: at })
	})

	it('leaves the stamp when the admin drops an entry', () => {
		expect(editedEntry(kept, { status: 'dropped' }, at)).toEqual({
			...kept,
			status: 'dropped',
		})
	})
})
