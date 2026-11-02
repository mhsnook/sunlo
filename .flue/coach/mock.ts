import {
	fauxAssistantMessage,
	fauxProvider,
	fauxText,
	fauxToolCall,
	type FauxContentBlock,
	type FauxResponseFactory,
} from '@earendil-works/pi-ai/providers/faux'
import { DECK_TARGET } from '../../src/features/coach/protocol'

// A scripted stand-in for the model, registered as `mock/coach` when
// VITE_COACH_USE_MOCK is set (vite.config.ts). It drives the real tools in a
// fixed pattern: search for what the learner typed, show it, add on request.

type Messages = Parameters<FauxResponseFactory>[0]['messages']
type Message = Messages[number]

const textOf = (message: Message) =>
	typeof message.content === 'string'
		? message.content
		: message.content
				.flatMap((block) => (block.type === 'text' ? [block.text] : []))
				.join('\n')

function lastShown(messages: Messages): Array<string> {
	for (const message of messages.toReversed()) {
		if (message.role !== 'assistant') continue
		for (const block of message.content.toReversed())
			if (block.type === 'toolCall' && block.name === 'show_on_page')
				return (block.arguments.phrase_ids as Array<string>) ?? []
	}
	return []
}

const reply = (blocks: Array<FauxContentBlock>) =>
	fauxAssistantMessage(blocks, {
		stopReason: blocks.some((b) => b.type === 'toolCall') ? 'toolUse' : 'stop',
	})

function respondToResults(messages: Messages) {
	const results = []
	for (const message of messages.toReversed()) {
		if (message.role !== 'toolResult') break
		results.push(message)
	}
	for (const result of results) {
		const output = JSON.parse(textOf(result) || '{}') as {
			phrases?: Array<{ id: string }>
			phrase_ids?: Array<string>
		}
		if (
			result.toolName === 'search_library' ||
			result.toolName === 'find_similar'
		) {
			const ids = (output.phrases ?? []).map((p) => p.id)
			if (!ids.length)
				return reply([
					fauxText(
						"I couldn't find phrases for that yet. Want to try another topic?"
					),
					fauxToolCall('suggest_replies', { replies: ['Greetings', 'Food'] }),
				])
			return reply([
				fauxText(
					`Here are ${ids.length} phrases. Add the ones you like, or I can add them all.`
				),
				fauxToolCall('show_on_page', {
					title:
						result.toolName === 'find_similar'
							? 'More like these'
							: 'From the library',
					phrase_ids: ids,
				}),
				fauxToolCall('suggest_replies', {
					replies: ['Add them all', 'More like these', 'Something else'],
				}),
			])
		}
		if (result.toolName === 'add_to_deck')
			return reply([
				fauxText(
					`Adding ${output.phrase_ids?.length ?? 0} phrases. A deck of about ${DECK_TARGET} is a good start. What should we look at next?`
				),
				fauxToolCall('suggest_replies', {
					replies: ['Greetings', 'Food', 'Getting around'],
				}),
			])
	}
	return reply([])
}

function respondToLearner(messages: Messages, message: Message) {
	const text = textOf(message)
		.split('\n')
		.filter((line) => !line.startsWith('[Page:') && !line.startsWith('[Deck:'))
		.join(' ')
		.trim()
	const shown = lastShown(messages)
	if (/\badd\b/i.test(text) && shown.length)
		return reply([fauxToolCall('add_to_deck', { phrase_ids: shown })])
	if (/more like/i.test(text) && shown.length)
		return reply([
			fauxToolCall('find_similar', { phrase_ids: shown.slice(0, 10) }),
		])
	return reply([fauxToolCall('search_library', { query: text.toLowerCase() })])
}

export function mockCoachProvider() {
	const faux = fauxProvider({ provider: 'mock', models: [{ id: 'coach' }] })
	const respond: FauxResponseFactory = (context) => {
		// Each response is consumed once; queue the next before answering.
		faux.appendResponses([respond])
		const messages = context.messages
		const last = messages.at(-1)
		return last?.role === 'toolResult'
			? respondToResults(messages)
			: respondToLearner(messages, last!)
	}
	faux.setResponses([respond])
	return faux.provider
}
