import { describe, expect, it } from 'vitest'
import type { CoachMessage } from './protocol'
import { appendUserBlocks, windowTranscript } from './transcript'

const said = (text: string) => ({ type: 'text' as const, text })
const result = (id: string) => ({
	type: 'tool_result' as const,
	tool_use_id: id,
	content: '{}',
})
const toolCall = (id: string) => ({
	type: 'tool_use' as const,
	id,
	name: 'get_deck',
	input: {},
})

describe('appendUserBlocks', () => {
	it('merges into a transcript that ends on a user message', () => {
		const transcript: Array<CoachMessage> = [
			{ role: 'assistant', content: [toolCall('a')] },
			{ role: 'user', content: [result('a')] },
		]
		expect(appendUserBlocks(transcript, [said('more')])).toEqual([
			{ role: 'assistant', content: [toolCall('a')] },
			{ role: 'user', content: [result('a'), said('more')] },
		])
	})

	it('answers a tool call that never got its result', () => {
		const transcript: Array<CoachMessage> = [
			{ role: 'assistant', content: [said('looking'), toolCall('a')] },
		]
		const [, next] = appendUserBlocks(transcript, [said('hello?')])
		expect(next.content).toEqual([
			{
				type: 'tool_result',
				tool_use_id: 'a',
				content: 'Interrupted before it finished.',
				is_error: true,
			},
			said('hello?'),
		])
	})

	it('leaves answered tool calls alone', () => {
		const transcript: Array<CoachMessage> = [
			{ role: 'assistant', content: [toolCall('a')] },
		]
		const [, next] = appendUserBlocks(transcript, [result('a')])
		expect(next.content).toEqual([result('a')])
	})
})

describe('windowTranscript', () => {
	it('keeps a short transcript whole', () => {
		const transcript: Array<CoachMessage> = [
			{ role: 'user', content: [said('hi')] },
			{ role: 'assistant', content: [said('hello')] },
		]
		expect(windowTranscript(transcript, 10)).toBe(transcript)
	})

	it('opens the window on a user message and drops its orphaned tool results', () => {
		const transcript: Array<CoachMessage> = [
			{ role: 'user', content: [said('one')] },
			{ role: 'assistant', content: [toolCall('a')] },
			{ role: 'user', content: [result('a'), said('two')] },
			{ role: 'assistant', content: [said('ok')] },
		]
		expect(windowTranscript(transcript, 3)).toEqual([
			{ role: 'user', content: [said('two')] },
			{ role: 'assistant', content: [said('ok')] },
		])
	})

	it('skips a user message that holds only tool results', () => {
		const transcript: Array<CoachMessage> = [
			{ role: 'user', content: [said('one')] },
			{ role: 'assistant', content: [toolCall('a')] },
			{ role: 'user', content: [result('a')] },
			{ role: 'assistant', content: [said('ok')] },
			{ role: 'user', content: [said('three')] },
		]
		expect(windowTranscript(transcript, 3)).toEqual([
			{ role: 'user', content: [said('three')] },
		])
	})
})
