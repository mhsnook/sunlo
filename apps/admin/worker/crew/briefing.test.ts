import { describe, expect, it } from 'vitest'
import type { CrewKey, CrewMessageType } from '../../shared/crew'
import {
	briefingText,
	documentsText,
	githubText,
	sitrepText,
	type BriefingInput,
} from './briefing'

const message = (
	over: Partial<CrewMessageType> & Pick<CrewMessageType, 'body' | 'place'>
): CrewMessageType => ({
	id: over.body,
	at: '2026-10-28T09:15:00Z',
	author: 'admin:u1',
	authorName: 'sam',
	routing: null,
	card: null,
	answer: null,
	corrected: null,
	receipt: false,
	otherViewOf: null,
	pick: null,
	...over,
})

const input = (
	agent: CrewKey,
	over: Partial<BriefingInput> = {}
): BriefingInput => ({
	now: '2026-10-28T10:00:00Z',
	agent,
	commonKnowledge: [{ id: 1, text: 'Call the admin Sam.', at: '' }],
	sitrep: null,
	documents: [],
	github: null,
	charter: [],
	workspace: { agent, todos: [], memory: [], openItems: [], cards: [] },
	cards: { waiting: [], answered: [] },
	command: null,
	unread: {
		common: { since: true, messages: [] },
		own: { since: false, messages: [] },
	},
	...over,
})

describe('briefingText', () => {
	it('names the Common Room and the agent’s own room', () => {
		const text = briefingText(
			input('product-1', {
				unread: {
					common: {
						since: true,
						messages: [message({ body: 'Morning, all', place: 'room' })],
					},
					own: {
						since: false,
						messages: [
							message({ body: 'How is onboarding?', place: 'room:product' }),
						],
					},
				},
			})
		)
		expect(text).toContain('It is now 2026-10-28 10:00 UTC.')
		expect(text).toContain('- Call the admin Sam.')
		expect(text).toContain(
			'## The Common Room since your last run\n\n[2026-10-28 09:15 UTC] sam: Morning, all'
		)
		expect(text).toContain(
			'## The Product room, latest messages\n\n[2026-10-28 09:15 UTC] sam: How is onboarding?'
		)
		expect(text.indexOf('## The Common Room')).toBeLessThan(
			text.indexOf('## The Product room, latest')
		)
	})

	it('briefs an associate on the room it works in', () => {
		const text = briefingText(input('command-2'))
		expect(text).toContain('## Cards in the Command room')
		expect(text).toContain('## The Command room, latest messages')
	})

	it('marks a timeline with nothing new', () => {
		const text = briefingText(input('product-1'))
		expect(text).toContain(
			'## The Common Room since your last run\n\n(nothing new)'
		)
	})

	it('lists the room’s waiting and answered cards', () => {
		const card = {
			kind: 'decide' as const,
			title: 'Ship the onboarding fix?',
			actions: [{ id: 'yes', label: 'Yes' }],
			ref: null,
		}
		const text = briefingText(
			input('product-1', {
				cards: {
					waiting: [
						message({
							body: 'Details',
							place: 'room:product',
							author: 'product-1',
							authorName: 'Product officer',
							card,
						}),
					],
					answered: [
						message({
							body: 'Earlier',
							place: 'room:product',
							card: { ...card, title: 'Hide the streak?' },
							answer: { actionId: 'yes', label: 'Yes', by: 'sam', at: '' },
						}),
					],
				},
			})
		)
		expect(text).toContain(
			'Waiting on the admin:\n- [decide, from Product officer] Ship the onboarding fix?'
		)
		expect(text).toContain('Recently answered:\n- Hide the streak?: "Yes"')
	})

	it("names the agent's own room on its charter, and gives the weekly cycle to the Command room only", () => {
		const command: BriefingInput['command'] = {
			weekly: { briefAt: null, meetingAt: null, timezone: 'Europe/Lisbon' },
			meetingStartedAt: null,
		}
		const firstOfficer = briefingText(input('command-1', { command }))
		expect(firstOfficer).toMatch(/## The charter: .*Command room/)
		expect(firstOfficer).toContain('## The weekly cycle')
		const product = briefingText(input('product-1', {}))
		expect(product).toMatch(/## The charter: .*Product room/)
		expect(product).not.toContain('## The weekly cycle')
	})

	it('marks a second view, and which one the admin went with', () => {
		const second = message({
			body: 'Slow down: the start flow asks too much at once.',
			place: 'room:product',
			author: 'product-2',
			authorName: 'Design officer',
			otherViewOf: 'm1',
		})
		const text = briefingText(
			input('product-1', {
				unread: {
					common: { since: true, messages: [] },
					own: {
						since: true,
						messages: [
							second,
							{
								...second,
								id: 'm3',
								pick: { chosen: 'other', by: 'sam', at: '' },
							},
						],
					},
				},
			})
		)
		expect(text).toContain('Design officer (a second view, beside the first):')
		expect(text).toContain(
			'Design officer (a second view; sam went with this one):'
		)
	})
})

describe('sitrepText', () => {
	it('gives the whole report, then its revision and who saved it', () => {
		const text = sitrepText({
			text: 'Retention first this month.\n\n**Product room**: onboarding.',
			revision: 4,
			byName: 'First officer',
			at: '2026-10-27T14:02:00Z',
		})
		expect(text).toBe(
			'## The Situation Report: where Sunlo and each room stand now\n\nRetention first this month.\n\n**Product room**: onboarding.\n\n(Revision 4, saved by First officer, 2026-10-27 14:02 UTC.)'
		)
	})

	it('says so when nobody has written it', () => {
		expect(sitrepText(null)).toContain('(Nobody has written it yet.)')
		expect(
			sitrepText({ text: '', revision: 0, byName: null, at: null })
		).toContain('(Nobody has written it yet.)')
	})
})

describe('documentsText', () => {
	it('lists each document without its text', () => {
		const text = documentsText('Product room', [
			{
				id: 3,
				room: 'product',
				name: 'Roadmap',
				revision: 2,
				byName: 'Product officer',
				at: '2026-10-28T07:01:00Z',
			},
			{
				id: 4,
				room: 'product',
				name: 'Launch checklist',
				revision: 0,
				byName: null,
				at: null,
			},
		])
		expect(text).toBe(
			"## The Product room's documents\n\n- Roadmap: revision 2, saved by Product officer, 2026-10-28 07:01 UTC\n- Launch checklist: not written yet"
		)
	})

	it('comes before the room’s cards in the briefing', () => {
		const text = briefingText(input('product-1'))
		expect(text).toContain("## The Product room's documents\n\n(none yet)")
		expect(text.indexOf("## The Product room's documents")).toBeLessThan(
			text.indexOf('## Cards in the Product room')
		)
	})
})

describe('githubText', () => {
	it('tells an agent with GitHub tools whether it has them', () => {
		expect(githubText({ access: 'write', connected: true })).toContain(
			"you keep mhsnook/sunlo's milestones and epics"
		)
		expect(githubText({ access: 'write', connected: false })).toContain(
			'you have no GitHub tools'
		)
		expect(githubText({ access: 'read', connected: true })).toContain(
			'read-only'
		)
	})

	it('leaves the section out for an agent without GitHub tools', () => {
		expect(briefingText(input('command-2'))).not.toContain('## GitHub')
		expect(
			briefingText(
				input('product-1', { github: { access: 'write', connected: false } })
			)
		).toContain('## GitHub')
	})
})
