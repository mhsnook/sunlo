import { describe, expect, it } from 'vitest'
import type { CrewKey, CrewMessageType } from '../../shared/crew'
import { briefingText, type BriefingInput } from './briefing'

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
	...over,
})

const input = (
	agent: CrewKey,
	over: Partial<BriefingInput> = {}
): BriefingInput => ({
	now: '2026-10-28T10:00:00Z',
	agent,
	commonKnowledge: [{ id: 1, text: 'Call the admin Sam.', at: '' }],
	sitrep: [],
	workspace: { agent, todos: [], memory: [], openItems: [], cards: [] },
	cards: { waiting: [], answered: [] },
	command: null,
	unread: [
		{ place: 'common', since: true, messages: [] },
		{ place: 'own', since: false, messages: [] },
	],
	...over,
})

describe('briefingText', () => {
	it('names the Common Room and the agent’s own room', () => {
		const text = briefingText(
			input('geordi', {
				unread: [
					{
						place: 'common',
						since: true,
						messages: [message({ body: 'Morning, all', place: 'room' })],
					},
					{
						place: 'own',
						since: false,
						messages: [
							message({ body: 'How is onboarding?', place: 'room:product' }),
						],
					},
				],
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
			text.indexOf('## The Product room')
		)
	})

	it('briefs an associate on the room it works in', () => {
		const text = briefingText(input('data'))
		expect(text).toContain('## Cards in the Command room')
		expect(text).toContain('## The Command room, latest messages')
	})

	it('marks a timeline with nothing new', () => {
		const text = briefingText(input('geordi'))
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
			input('geordi', {
				cards: {
					waiting: [
						message({
							body: 'Details',
							place: 'room:product',
							author: 'geordi',
							authorName: 'Geordi',
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
			'Waiting on the admin:\n- [decide, from Geordi] Ship the onboarding fix?'
		)
		expect(text).toContain('Recently answered:\n- Hide the streak?: "Yes"')
	})

	it('gives the charter and the weekly cycle to the Command room only', () => {
		const command: BriefingInput['command'] = {
			charter: [
				{
					id: 3,
					kind: 'principle',
					text: 'Retention before growth.',
					why: null,
					status: 'kept',
					at: '',
					keptAt: '',
				},
			],
			weekly: { briefAt: null, meetingAt: null, timezone: 'Europe/Lisbon' },
			meetingStartedAt: null,
		}
		const riker = briefingText(input('riker', { command }))
		expect(riker).toContain('- [principle 3] Retention before growth.')
		expect(riker).toContain(
			"The last weekly meeting was never. The admin's time zone is Europe/Lisbon."
		)
		expect(briefingText(input('geordi'))).not.toContain('## The charter')
	})
})
