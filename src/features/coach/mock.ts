import {
	DECK_TARGET,
	type CoachMessage,
	type CoachRequest,
	type CoachResponse,
	type ToolUseBlock,
} from './protocol'

// A scripted stand-in for the model, for scenetest and for running the page
// without the worker. It drives the same tools in a fixed pattern: search,
// show, add on request.

let callCount = 0
const call = (name: string, input: Record<string, unknown>): ToolUseBlock => ({
	type: 'tool_use',
	id: `mock_${++callCount}`,
	name,
	input,
})

const say = (text: string) => ({ type: 'text' as const, text })

const done = (
	content: CoachResponse['content'],
	stop = 'end_turn'
): CoachResponse => ({ content, stop_reason: stop })

function lastShown(messages: Array<CoachMessage>): Array<string> {
	for (const message of messages.toReversed()) {
		if (message.role !== 'assistant') continue
		for (const block of message.content.toReversed())
			if (block.type === 'tool_use' && block.name === 'show_on_page')
				return (block.input.phrase_ids as Array<string>) ?? []
	}
	return []
}

function toolNamesBefore(messages: Array<CoachMessage>, index: number) {
	const prior = messages[index - 1]
	if (prior?.role !== 'assistant') return new Map<string, ToolUseBlock>()
	return new Map(
		prior.content
			.filter((b): b is ToolUseBlock => b.type === 'tool_use')
			.map((b) => [b.id, b])
	)
}

function learnerText(message: CoachMessage) {
	return message.content
		.filter((b) => b.type === 'text')
		.map((b) => b.text)
		.filter((t) => !t.startsWith('[Page:'))
		.join(' ')
		.trim()
}

function respondToResults(body: CoachRequest): CoachResponse {
	const last = body.messages.length - 1
	const calls = toolNamesBefore(body.messages, last)
	const message = body.messages[last]

	for (const block of message.content) {
		if (block.type !== 'tool_result') continue
		const tool = calls.get(block.tool_use_id)
		const result = JSON.parse(block.content) as Record<string, unknown>
		switch (tool?.name) {
			case 'search_library':
			case 'find_similar': {
				const phrases = result.phrases as Array<{ id: string }>
				if (!phrases.length)
					return done([
						say(
							"I couldn't find phrases for that yet. Want to try another topic?"
						),
						call('suggest_replies', { replies: ['Greetings', 'Food'] }),
					])
				const query = (tool.input.query as string | undefined) ?? ''
				const title =
					tool.name === 'find_similar'
						? 'More like these'
						: query
							? query[0].toUpperCase() + query.slice(1)
							: 'From the library'
				return done(
					[
						say(
							`Here are ${phrases.length} phrases. Add the ones you like, or I can add them all.`
						),
						call('show_on_page', {
							title,
							phrase_ids: phrases.map((p) => p.id),
						}),
						call('suggest_replies', {
							replies: ['Add them all', 'More like these', 'Something else'],
						}),
					],
					'tool_use'
				)
			}
			case 'add_to_deck':
				return done([
					say(
						`Done. Your deck is at ${result.deck_size as number} of ${DECK_TARGET}. What should we look at next?`
					),
					call('suggest_replies', {
						replies: ['Greetings', 'Food', 'Getting around'],
					}),
				])
		}
	}
	return done([])
}

export async function mockCoachStep(
	body: CoachRequest
): Promise<CoachResponse> {
	await new Promise((resolve) => setTimeout(resolve, 300))
	const message = body.messages.at(-1)!
	const text = learnerText(message)
	if (!text) return respondToResults(body)

	if (/\badd\b/i.test(text)) {
		const ids = lastShown(body.messages)
		if (ids.length)
			return done([call('add_to_deck', { phrase_ids: ids })], 'tool_use')
	}
	if (/more like/i.test(text)) {
		const ids = lastShown(body.messages)
		if (ids.length)
			return done(
				[
					call('find_similar', {
						phrase_ids: ids.slice(0, 10),
						not_in_deck: true,
					}),
				],
				'tool_use'
			)
	}
	return done(
		[call('search_library', { query: text.toLowerCase() })],
		'tool_use'
	)
}
