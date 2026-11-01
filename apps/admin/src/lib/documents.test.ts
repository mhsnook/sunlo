import { describe, expect, it } from 'vitest'
import { SITREP, type DocumentSummaryType } from '../../shared/crew'
import { CREW, documentLinkOptions, roomDocuments } from './documents'

const doc = (
	room: DocumentSummaryType['room'],
	name: string
): DocumentSummaryType => ({
	id: name.length,
	room,
	name,
	revision: 1,
	byName: 'Riker',
	at: '2026-10-28T07:01:00Z',
})

const sitrep = doc('command', SITREP)
const plan = doc('command', 'Business plan and status')
const roadmap = doc('product', 'Roadmap')
const all = [sitrep, plan, roadmap]

describe('roomDocuments', () => {
	it('gives the Common Room the Situation Report alone', () => {
		expect(roomDocuments(CREW, all)).toEqual([sitrep])
	})

	it('pins the Situation Report first in the Command room', () => {
		expect(roomDocuments('command', all)).toEqual([sitrep, plan])
	})

	it('puts the Situation Report before another room’s own documents', () => {
		expect(roomDocuments('product', all)).toEqual([sitrep, roadmap])
	})

	it('leaves out a room that keeps nothing', () => {
		expect(roomDocuments('library', [roadmap])).toEqual([])
	})
})

describe('documentLinkOptions', () => {
	it('opens a document in the room the admin is reading', () => {
		expect(documentLinkOptions('product', roadmap)).toEqual({
			to: '/room/$room',
			params: { room: 'product' },
			search: { doc: 'roadmap' },
		})
	})

	it('goes to the room that keeps a document from anywhere else', () => {
		expect(documentLinkOptions('library', roadmap)).toEqual({
			to: '/room/$room',
			params: { room: 'product' },
			search: { doc: 'roadmap' },
		})
		expect(documentLinkOptions(CREW, plan)).toEqual({
			to: '/room/$room',
			params: { room: 'command' },
			search: { doc: 'business-plan-and-status' },
		})
	})

	it('keeps the Situation Report where the admin already is', () => {
		expect(documentLinkOptions(CREW, sitrep)).toEqual({
			to: '/',
			search: { doc: 'situation-report' },
		})
		expect(documentLinkOptions('product', sitrep)).toEqual({
			to: '/room/$room',
			params: { room: 'product' },
			search: { doc: 'situation-report' },
		})
	})
})
