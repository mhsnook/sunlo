import { describe, expect, it } from 'vitest'
import type { FlueConversationMessage } from '@flue/react'
import { composeMessage, pageActions, readConversation } from './conversation'
import { parseCoachContext } from './protocol'

type Part = FlueConversationMessage['parts'][number]

const message = (
	id: string,
	role: 'user' | 'assistant',
	parts: Array<Part>,
	extra: Partial<FlueConversationMessage> = {}
) =>
	({
		id,
		role,
		purpose: role,
		display: 'visible',
		parts,
		...extra,
	}) as FlueConversationMessage

const text = (value: string): Part =>
	({ type: 'text', text: value, state: 'done' }) as Part

const tool = (name: string, output: unknown, id = name): Part =>
	({
		type: 'dynamic-tool',
		toolName: name,
		toolCallId: id,
		state: 'output-available',
		input: {},
		output,
	}) as Part

const CONTEXT = { lang: 'kan', translationLang: 'eng', learnerName: 'Priya' }

const read = (messages: Array<FlueConversationMessage>) =>
	readConversation(messages, 'kan')

const kanMessage = (said: string, lang = 'kan') =>
	composeMessage(said, {
		context: { ...CONTEXT, lang },
		notes: [],
		deck: '0 of 100 phrases',
		opening: null,
	})

const SHOWN = {
	lang: 'kan',
	title: 'Tea',
	subtitle: null,
	phrase_ids: ['p1', 'p2'],
	request_ids: [],
	playlist_ids: [],
}

describe('composeMessage', () => {
	it('puts the page lines before the learner text', () => {
		expect(
			composeMessage('tea please', {
				context: CONTEXT,
				notes: ['added “Ondu tea kodhe”'],
				deck: '8 of 100 phrases',
				opening: 'Hi. What brings you to Kannada?',
			})
		).toBe(
			[
				'[Context: {"lang":"kan","translationLang":"eng","learnerName":"Priya"}]',
				'[Page: you opened with: Hi. What brings you to Kannada?]',
				'[Page: added “Ondu tea kodhe”]',
				'[Deck: 8 of 100 phrases]',
				'tea please',
			].join('\n')
		)
	})
})

describe('readConversation', () => {
	it('shows the learner their words and the page notes, never the context or deck lines', () => {
		const body = composeMessage('tea', {
			context: CONTEXT,
			notes: ['added one'],
			deck: '8 of 100 phrases',
			opening: 'Hi.',
		})
		const { log } = read([message('m1', 'user', [text(body)])])
		expect(log.map(({ kind, text }) => [kind, text])).toEqual([
			['coach', 'Hi.'],
			['action', 'added one'],
			['learner', 'tea'],
		])
	})

	it('keeps a learner line that starts with a bracket', () => {
		const { log } = read([
			message('m1', 'user', [text('[sic] how do I say this')]),
		])
		expect(log).toEqual([
			{ id: 'm1:0', kind: 'learner', text: '[sic] how do I say this' },
		])
	})

	it('turns show_on_page into a view and offers the last suggestions', () => {
		const { views, suggestions, log } = read([
			message('m1', 'user', [text(kanMessage('tea'))]),
			message('m2', 'assistant', [
				text('Here are two.'),
				tool('show_on_page', SHOWN, 'call-1'),
				tool('suggest_replies', { replies: ['Add them all'] }),
			]),
		])
		expect(views).toEqual([
			{
				id: 'call-1',
				lang: 'kan',
				title: 'Tea',
				subtitle: null,
				phraseIds: ['p1', 'p2'],
				requestIds: [],
				playlistIds: [],
				draftRequest: null,
			},
		])
		expect(suggestions).toEqual(['Add them all'])
		expect(log.at(-1)?.text).toBe('Showing “Tea” · 2 phrases')
	})

	it('offers no suggestions once the learner has answered', () => {
		const { suggestions } = read([
			message('m1', 'assistant', [
				tool('suggest_replies', { replies: ['Food'] }),
			]),
			message('m2', 'user', [text('Food')]),
		])
		expect(suggestions).toEqual([])
	})

	it("keeps another language's sets and suggestions off this page", () => {
		const { views, suggestions, log } = read([
			message('m1', 'user', [text(kanMessage('tea', 'hin'))]),
			message('m2', 'assistant', [
				tool('show_on_page', { ...SHOWN, lang: 'hin' }),
				tool('suggest_replies', { replies: ['Add them all'] }),
			]),
		])
		expect(views).toEqual([])
		expect(suggestions).toEqual([])
		expect(log.at(-1)?.text).toBe(
			'Showing “Tea” · 2 phrases on your Hindi page'
		)
	})

	it('turns draft_request into a request draft on the page', () => {
		const { views } = read([
			message('m1', 'assistant', [
				tool('draft_request', { lang: 'kan', prompt: 'How do I say thanks?' }),
			]),
		])
		expect(views).toMatchObject([{ draftRequest: 'How do I say thanks?' }])
	})

	it('ignores a tool output that does not match its shape', () => {
		const { views } = read([
			message('m1', 'assistant', [tool('show_on_page', { title: 3 })]),
		])
		expect(views).toEqual([])
	})

	it('reports a failed turn', () => {
		const { log } = read([
			message('m1', 'assistant', [], {
				display: 'diagnostic',
				settlement: { outcome: 'failed' },
			}),
		])
		expect(log.map((entry) => entry.kind)).toEqual(['error'])
	})
})

describe('pageActions', () => {
	it('collects only the given submission’s deck writes and navigation', () => {
		const messages = [
			message(
				'm1',
				'assistant',
				[tool('add_to_deck', { phrase_ids: ['old'] })],
				{
					submissionId: 'sub-1',
				}
			),
			message(
				'm2',
				'assistant',
				[
					tool('add_to_deck', { phrase_ids: ['p1', 'p2'] }),
					tool('navigate', { to: 'review' }),
				],
				{ submissionId: 'sub-2' }
			),
		]
		expect(pageActions(messages, 'sub-2')).toEqual({
			add: ['p1', 'p2'],
			shown: [],
			navigate: { to: 'review' },
		})
	})
})

describe('the context line', () => {
	it('round-trips through a message', () => {
		const body = composeMessage('hi', {
			context: CONTEXT,
			notes: [],
			deck: '0 of 100 phrases',
			opening: null,
		})
		expect(parseCoachContext(body)).toEqual(CONTEXT)
		expect(parseCoachContext('no context here')).toBeNull()
	})
})
