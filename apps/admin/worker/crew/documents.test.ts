import { describe, expect, it } from 'vitest'
import {
	DOCUMENT_MAX,
	documentHref,
	documentSlug,
	documentSlugInHref,
	findDocumentBySlug,
	SITREP,
	SITREP_MAX,
	type DocumentSummaryType,
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
	it('slugs a name so a Markdown link target can hold it', () => {
		expect(documentSlug('Roadmap')).toBe('roadmap')
		expect(documentSlug(SITREP)).toBe('situation-report')
		expect(documentSlug('Business plan and status')).toBe(
			'business-plan-and-status'
		)
		expect(documentSlug("O'Brien's six-week plan!")).toBe(
			'o-brien-s-six-week-plan'
		)
	})

	it('writes a link target for a document', () => {
		expect(documentHref('Business plan and status')).toBe(
			'doc:business-plan-and-status'
		)
	})

	it('reads the slug back from a target, however it was spelt', () => {
		expect(documentSlugInHref('doc:roadmap')).toBe('roadmap')
		expect(documentSlugInHref('doc:Roadmap')).toBe('roadmap')
		expect(documentSlugInHref('doc:Business%20plan%20and%20status')).toBe(
			'business-plan-and-status'
		)
		expect(documentSlugInHref('doc:%E0%A4%A')).toBe('e0-a4-a')
	})

	it('leaves an ordinary URL alone', () => {
		expect(documentSlugInHref('https://sunlo.app/doc:roadmap')).toBe(null)
		expect(documentSlugInHref('/room/product')).toBe(null)
		expect(documentSlugInHref('doc:')).toBe(null)
	})

	it('finds the document a slug names', () => {
		const documents: Array<DocumentSummaryType> = [
			{
				id: 1,
				room: 'command',
				name: SITREP,
				revision: 3,
				byName: 'Riker',
				at: '2026-10-28T07:01:00Z',
			},
			{
				id: 2,
				room: 'product',
				name: 'Roadmap',
				revision: 1,
				byName: "O'Brien",
				at: '2026-10-28T07:01:00Z',
			},
		]
		expect(findDocumentBySlug(documents, 'situation-report')?.id).toBe(1)
		expect(findDocumentBySlug(documents, 'roadmap')?.id).toBe(2)
		expect(findDocumentBySlug(documents, 'launch-checklist')).toBe(null)
	})
})
