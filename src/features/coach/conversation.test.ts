import { describe, expect, it } from 'vitest'
import type { FlueConversationMessage } from '@flue/react'
import { composeMessage, pageActions, readConversation } from './conversation'

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

const SHOWN = {
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
				notes: ['added “Ondu tea kodhe”'],
				deck: '8 of 100 phrases',
				opening: 'Hi. What brings you to Kannada?',
			})
		).toBe(
			[
				'[Page: you opened with: Hi. What brings you to Kannada?]',
				'[Page: added “Ondu tea kodhe”]',
				'[Deck: 8 of 100 phrases]',
				'tea please',
			].join('\n')
		)
	})
})

describe('readConversation', () => {
	it('shows the learner their words and the page notes, never the deck line', () => {
		const body = composeMessage('tea', {
			notes: ['added one'],
			deck: '8 of 100 phrases',
			opening: 'Hi.',
		})
		const { log } = readConversation([message('m1', 'user', [text(body)])])
		expect(log.map(({ kind, text }) => [kind, text])).toEqual([
			['coach', 'Hi.'],
			['action', 'added one'],
			['learner', 'tea'],
		])
	})

	it('keeps a learner line that starts with a bracket', () => {
		const { log } = readConversation([
			message('m1', 'user', [text('[sic] how do I say this')]),
		])
		expect(log).toEqual([
			{ id: 'm1:0', kind: 'learner', text: '[sic] how do I say this' },
		])
	})

	it('turns show_on_page into a view and offers the last suggestions', () => {
		const { views, suggestions, log } = readConversation([
			message('m1', 'user', [text('tea')]),
			message('m2', 'assistant', [
				text('Here are two.'),
				tool('show_on_page', SHOWN, 'call-1'),
				tool('suggest_replies', { replies: ['Add them all'] }),
			]),
		])
		expect(views).toEqual([
			{
				id: 'call-1',
				title: 'Tea',
				subtitle: null,
				phraseIds: ['p1', 'p2'],
				requestIds: [],
				playlistIds: [],
			},
		])
		expect(suggestions).toEqual(['Add them all'])
		expect(log.at(-1)?.text).toBe('Showing “Tea” · 2 phrases')
	})

	it('offers no suggestions once the learner has answered', () => {
		const { suggestions } = readConversation([
			message('m1', 'assistant', [
				tool('suggest_replies', { replies: ['Food'] }),
			]),
			message('m2', 'user', [text('Food')]),
		])
		expect(suggestions).toEqual([])
	})

	it('ignores a tool output that does not match its shape', () => {
		const { views } = readConversation([
			message('m1', 'assistant', [tool('show_on_page', { title: 3 })]),
		])
		expect(views).toEqual([])
	})

	it('reports a failed turn', () => {
		const { log } = readConversation([
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
			navigate: { to: 'review' },
		})
	})
})
