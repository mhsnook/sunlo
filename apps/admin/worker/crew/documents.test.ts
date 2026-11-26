import { describe, expect, it } from 'vitest'
import {
	DOCUMENT_MAX,
	documentHref,
	SITREP,
	SITREP_MAX,
} from '../../shared/crew'
import { checkSave } from './documents'

describe('checkSave', () => {
	it('saves from the current revision as the next one', () => {
		expect(
			checkSave({ name: 'Roadmap', current: 3, base: 3, text: 'Plan' })
		).toEqual({ ok: true, revision: 4 })
	})

	it('writes revision 1 of a document nobody has written', () => {
		expect(
			checkSave({ name: 'Roadmap', current: 0, base: 0, text: 'Plan' })
		).toEqual({ ok: true, revision: 1 })
	})

	it('refuses a save that started from an older revision', () => {
		const check = checkSave({
			name: 'Roadmap',
			current: 5,
			base: 4,
			text: 'Plan',
		})
		expect(check).toMatchObject({ ok: false, status: 409 })
		expect(!check.ok && check.error).toContain(
			'"Roadmap" is at revision 5, and this save started from revision 4'
		)
		expect(!check.ok && check.error).toContain('save again from revision 5')
	})

	it('refuses a save from a revision the document has not reached', () => {
		expect(
			checkSave({ name: 'Roadmap', current: 2, base: 7, text: 'Plan' })
		).toMatchObject({ ok: false, status: 409 })
	})

	it('starts a new document only from revision 0', () => {
		expect(
			checkSave({ name: 'Hiring plan', current: null, base: 0, text: 'Plan' })
		).toEqual({ ok: true, revision: 1 })
		expect(
			checkSave({ name: 'Hiring plan', current: null, base: 2, text: 'Plan' })
		).toMatchObject({ ok: false, status: 404 })
	})

	it('holds the Situation Report to its own, smaller cap', () => {
		const long = 'x'.repeat(SITREP_MAX + 1)
		expect(
			checkSave({ name: SITREP, current: 1, base: 1, text: long })
		).toMatchObject({ ok: false, status: 400 })
		expect(
			checkSave({ name: 'Roadmap', current: 1, base: 1, text: long })
		).toEqual({ ok: true, revision: 2 })
		expect(
			checkSave({
				name: 'Roadmap',
				current: 1,
				base: 1,
				text: 'x'.repeat(DOCUMENT_MAX + 1),
			})
		).toMatchObject({ ok: false, status: 400 })
	})
})

describe('document links', () => {
	it('writes a link target from a document id', () => {
		expect(documentHref(3)).toBe('doc:3')
	})
})
