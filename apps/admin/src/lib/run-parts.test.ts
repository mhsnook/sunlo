import { describe, expect, it } from 'vitest'
import type { CrewMessageType, RunStepType, RunType } from '../../shared/crew'
import { placeRuns } from './run-parts'

const at = (second: number) =>
	new Date(Date.UTC(2026, 10, 2, 6, 0, second)).toISOString()

const step = (
	id: string,
	second: number,
	state: RunStepType['state'] = 'done'
): RunStepType => ({
	id,
	kind: 'tool',
	state,
	title: { running: id, done: id, failed: id },
	detail: null,
	error: null,
	at: at(second),
	ms: null,
})

const message = (
	id: string,
	second: number,
	extra: Partial<CrewMessageType> = {}
): CrewMessageType => ({
	id,
	at: at(second),
	author: 'product-1',
	authorName: "O'Brien",
	body: id,
	images: [],
	routing: null,
	card: null,
	answer: null,
	place: 'room:product',
	corrected: null,
	receipt: false,
	otherViewOf: null,
	parent: null,
	thread: null,
	pick: null,
	github: null,
	...extra,
})

const run = (extra: Partial<RunType>): RunType => ({
	id: 1,
	agent: 'product-1',
	thread: null,
	startedAt: at(0),
	endedAt: null,
	outcome: 'working',
	messageId: null,
	steps: [],
	dropped: 0,
	error: null,
	...extra,
})

const ids = (parts: Array<RunType> | undefined) =>
	parts?.map((part) => part.steps.map((s) => s.id))

describe('placeRuns', () => {
	it('draws the steps before a message above it and the rest live', () => {
		const working = run({
			steps: [step('read', 1), step('post', 5), step('edit', 20, 'running')],
		})
		const parts = placeRuns(
			[working],
			[message('trigger', 0, { author: 'admin:me' }), message('reply', 6)],
			['product-1']
		)
		expect(ids(parts.above.get('reply'))).toEqual([['read', 'post']])
		expect(parts.above.get('reply')?.[0].outcome).toBe('done')
		expect(ids(parts.live)).toEqual([['edit']])
		expect(parts.live[0].outcome).toBe('working')
		expect(parts.under.size).toBe(0)
	})

	it('keeps a part working while the call that posted it runs', () => {
		const working = run({ steps: [step('post', 5, 'running')] })
		const parts = placeRuns([working], [message('reply', 6)], ['product-1'])
		expect(parts.above.get('reply')?.[0].outcome).toBe('working')
		expect(parts.live).toEqual([])
	})

	it('folds what followed the last message under it when the run ends', () => {
		const ended = run({
			outcome: 'done',
			endedAt: at(30),
			messageId: 'second',
			steps: [step('a', 1), step('b', 8), step('c', 12)],
			dropped: 3,
		})
		const parts = placeRuns(
			[ended],
			[message('first', 5), message('second', 10)],
			['product-1']
		)
		expect(ids(parts.above.get('first'))).toEqual([['a']])
		expect(parts.above.get('first')?.[0].dropped).toBe(3)
		expect(ids(parts.above.get('second'))).toEqual([['b']])
		expect(parts.above.get('second')?.[0].dropped).toBe(0)
		expect(ids(parts.under.get('second'))).toEqual([['c']])
	})

	it('puts how a run ended on its last part', () => {
		const failed = run({
			outcome: 'failed',
			endedAt: at(30),
			error: 'boom',
			steps: [step('a', 1)],
		})
		const parts = placeRuns([failed], [message('reply', 5)], ['product-1'])
		expect(parts.above.get('reply')?.[0]).toMatchObject({
			outcome: 'failed',
			error: 'boom',
		})
		expect(parts.under.size).toBe(0)
	})

	it('keeps a run whole when it said nothing in the timeline', () => {
		const ended = run({
			outcome: 'done',
			endedAt: at(30),
			messageId: 'trigger',
			steps: [step('a', 1)],
		})
		const parts = placeRuns(
			[ended],
			[
				message('trigger', 0, { author: 'admin:me' }),
				message('receipt', 20, { receipt: true }),
				message('earlier', 0, { at: at(-60) }),
			],
			['product-1']
		)
		expect(ids(parts.under.get('trigger'))).toEqual([['a']])
		expect(parts.above.size).toBe(0)
	})

	it('shows only the live steps of agents in the room', () => {
		const working = run({ steps: [step('a', 1)] })
		expect(placeRuns([working], [], ['command-1']).live).toEqual([])
	})
})
