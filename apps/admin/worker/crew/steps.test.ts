import type { FlueObservation } from '@flue/runtime'
import { describe, expect, it } from 'vitest'
import {
	applyStep,
	clip,
	describeTool,
	errorText,
	MAX_STEPS,
	stepChange,
	type RunSteps,
} from './steps'

const empty: RunSteps = { steps: [], dropped: 0 }

// The envelope every Flue event carries, around one event's own fields.
const observed = (event: Record<string, unknown>) =>
	({
		v: 3,
		eventIndex: 1,
		timestamp: '2026-10-30T10:00:00.000Z',
		...event,
	}) as unknown as FlueObservation

describe('clip', () => {
	it('keeps short text, trimmed', () => {
		expect(clip('  a query  ', 20)).toBe('a query')
	})

	it('cuts long text to the limit, with an ellipsis', () => {
		const clipped = clip('x'.repeat(50), 10)
		expect(clipped).toHaveLength(10)
		expect(clipped.endsWith('…')).toBe(true)
	})
})

describe('describeTool', () => {
	it('names a query, and keeps the SQL to read in full', () => {
		expect(describeTool('command-2', 'run_sql', { query: 'select 1' })).toEqual(
			{
				title: {
					running: 'Running a query',
					done: 'Ran a query',
					failed: 'Failed to run a query',
				},
				detail: 'select 1',
			}
		)
	})

	it('names the document it read', () => {
		expect(
			describeTool('product-1', 'read_document', { name: 'Roadmap' }).title.done
		).toBe('Read the Roadmap')
		expect(
			describeTool('product-1', 'read_document', {
				name: 'Situation Report',
				room: 'command',
			}).title.done
		).toBe('Read the Situation Report in the Command room')
	})

	it("posts in the agent's own room", () => {
		expect(
			describeTool('product-1', 'post_to_room', { body: 'Done.' }).title.running
		).toBe('Posting in the Product room')
	})

	it('names who a note goes to by display name', () => {
		expect(
			describeTool('command-1', 'pass_note', { to: 'data', body: 'A count?' })
				.title.done
		).toBe('Passed a note to Data')
	})

	it('keeps a long key input to one short line', () => {
		const title = describeTool('product-1', 'add_todo', {
			text: `Ship\nthe ${'very '.repeat(30)}long thing`,
		}).title.done
		expect(title.startsWith('Added a to-do: Ship the very')).toBe(true)
		expect(title).not.toContain('\n')
		expect(title.length).toBeLessThan(90)
	})

	it('truncates the detail', () => {
		const { detail } = describeTool('command-2', 'run_sql', {
			query: 'select '.repeat(100),
		})
		expect(detail?.length).toBe(300)
	})

	it('reads a tool it does not know by its name', () => {
		expect(describeTool('product-1', 'make_tea', {}).title.done).toBe(
			'Used make tea'
		)
	})

	it('survives missing input', () => {
		expect(describeTool('product-1', 'read_issue', undefined).title.done).toBe(
			'Read issue'
		)
	})
})

describe('errorText', () => {
	it("reads a failed tool's text content", () => {
		expect(
			errorText({ content: [{ type: 'text', text: 'Only one SELECT.' }] })
		).toBe('Only one SELECT.')
	})

	it('is null for a result with no text', () => {
		expect(errorText({ content: [] })).toBeNull()
		expect(errorText(undefined)).toBeNull()
	})
})

describe('stepChange', () => {
	it('turns a tool call into a step that starts and ends', () => {
		expect(
			stepChange(
				'command-2',
				observed({
					type: 'tool_start',
					toolName: 'run_sql',
					toolCallId: 'call-1',
					origin: 'model',
					args: { query: 'select 1' },
				})
			)
		).toMatchObject({
			type: 'tool-start',
			id: 'call-1',
			detail: 'select 1',
			title: { running: 'Running a query' },
		})
		expect(
			stepChange(
				'command-2',
				observed({
					type: 'tool',
					toolName: 'run_sql',
					toolCallId: 'call-1',
					origin: 'model',
					isError: true,
					durationMs: 120,
					result: { content: [{ type: 'text', text: 'Timed out' }] },
				})
			)
		).toMatchObject({
			type: 'tool-end',
			failed: true,
			error: 'Timed out',
			ms: 120,
		})
	})

	it('leaves out tools the framework calls', () => {
		expect(
			stepChange(
				'command-2',
				observed({
					type: 'tool_start',
					toolName: 'finish',
					toolCallId: 'call-2',
					origin: 'framework',
				})
			)
		).toBeNull()
	})

	it('keys thinking by its turn and block', () => {
		expect(
			stepChange(
				'product-1',
				observed({
					type: 'thinking_end',
					turnId: 'turn-4',
					contentIndex: 0,
					content: 'Check the roadmap first.',
				})
			)
		).toMatchObject({
			type: 'thinking-end',
			id: 'turn-4:0',
			text: 'Check the roadmap first.',
		})
	})

	it('ignores every other event', () => {
		expect(
			stepChange('product-1', observed({ type: 'text_delta', text: 'Hi' }))
		).toBeNull()
	})
})

const title = { running: 'Running a query', done: 'Ran a query', failed: 'x' }

describe('applyStep', () => {
	it('ends a running tool step', () => {
		const started = applyStep(empty, {
			type: 'tool-start',
			id: 'a',
			title,
			detail: 'select 1',
			at: '2026-10-30T10:00:00.000Z',
		})
		expect(started.steps[0].state).toBe('running')
		const ended = applyStep(started, {
			type: 'tool-end',
			id: 'a',
			title,
			failed: false,
			error: null,
			ms: 40,
			at: '2026-10-30T10:00:01.000Z',
		})
		expect(ended.steps).toEqual([
			expect.objectContaining({
				state: 'done',
				detail: 'select 1',
				ms: 40,
			}),
		])
	})

	it('adds a tool step whose start it never heard', () => {
		const ended = applyStep(empty, {
			type: 'tool-end',
			id: 'b',
			title,
			failed: true,
			error: 'No such table',
			ms: 5,
			at: '2026-10-30T10:00:00.000Z',
		})
		expect(ended.steps[0]).toMatchObject({
			kind: 'tool',
			state: 'failed',
			error: 'No such table',
		})
	})

	it('times a thinking block, and truncates its text', () => {
		const started = applyStep(empty, {
			type: 'thinking-start',
			id: 't:0',
			at: '2026-10-30T10:00:00.000Z',
		})
		const ended = applyStep(started, {
			type: 'thinking-end',
			id: 't:0',
			text: 'why '.repeat(400),
			at: '2026-10-30T10:00:05.000Z',
		})
		expect(ended.steps[0]).toMatchObject({ state: 'done', ms: 5000 })
		expect(ended.steps[0].detail).toHaveLength(600)
	})

	it('drops a thinking block with no text', () => {
		const started = applyStep(empty, {
			type: 'thinking-start',
			id: 't:0',
			at: '2026-10-30T10:00:00.000Z',
		})
		expect(
			applyStep(started, {
				type: 'thinking-end',
				id: 't:0',
				text: '  ',
				at: '2026-10-30T10:00:01.000Z',
			}).steps
		).toEqual([])
	})

	it('keeps the latest steps and counts the ones it drops', () => {
		let run = empty
		for (let i = 0; i < MAX_STEPS + 3; i++) {
			run = applyStep(run, {
				type: 'tool-start',
				id: `call-${i}`,
				title,
				detail: null,
				at: '2026-10-30T10:00:00.000Z',
			})
		}
		expect(run.steps).toHaveLength(MAX_STEPS)
		expect(run.dropped).toBe(3)
		expect(run.steps[0].id).toBe('call-3')
	})

	it('ignores a start it has already heard', () => {
		const change = {
			type: 'tool-start' as const,
			id: 'a',
			title,
			detail: null,
			at: '2026-10-30T10:00:00.000Z',
		}
		expect(applyStep(applyStep(empty, change), change).steps).toHaveLength(1)
	})
})
