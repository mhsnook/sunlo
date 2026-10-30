import type { FlueObservation } from '@flue/runtime'
import {
	crewKeys,
	displayName,
	handleOf,
	roomNames,
	roomOf,
	type CrewKey,
	type RunStepType,
} from '../../shared/crew'

// What the room keeps of each run, so the steps of a long run, and the
// runs of a busy week, stay small.
export const MAX_STEPS = 40
export const RUNS_KEPT = 10
const DETAIL_MAX = 300
const THINKING_MAX = 600
const ERROR_MAX = 200
const INPUT_MAX = 60

export type StepTitle = RunStepType['title']

// One change to a run's steps, from one Flue event.
export type StepChange =
	| {
			type: 'tool-start'
			id: string
			title: StepTitle
			detail: string | null
			at: string
	  }
	| {
			type: 'tool-end'
			id: string
			// For a call whose start the room never heard, such as one that began
			// before the agent's isolate restarted.
			title: StepTitle
			failed: boolean
			error: string | null
			ms: number
			at: string
	  }
	| { type: 'thinking-start'; id: string; at: string }
	| { type: 'thinking-end'; id: string; text: string; at: string }

export type RunSteps = { steps: Array<RunStepType>; dropped: number }

export function clip(text: string, max: number) {
	const trimmed = text.trim()
	return trimmed.length > max
		? `${trimmed.slice(0, max - 1).trimEnd()}…`
		: trimmed
}

const oneLine = (text: string, max: number) =>
	clip(text.replace(/\s+/g, ' '), max)

type Args = Record<string, unknown>

const text = (args: Args, key: string) => {
	const value = args[key]
	return typeof value === 'string' && value.trim()
		? oneLine(value, INPUT_MAX)
		: null
}
const number = (args: Args, key: string) => {
	const value = args[key]
	return typeof value === 'number' ? value : null
}
const day = (args: Args, key: string) => text(args, key)?.slice(0, 10) ?? null

// A verb's three forms, and what follows it: "Running", "Ran", "run", and
// "a query".
type Phrase = [doing: string, done: string, base: string, rest: string]

const titleOf = ([doing, done, base, rest]: Phrase): StepTitle => {
	const tail = rest ? ` ${rest}` : ''
	return {
		running: `${doing}${tail}`,
		done: `${done}${tail}`,
		failed: `Failed to ${base}${tail}`,
	}
}

const named = (prefix: string, value: string | null) =>
	value ? `${prefix}: ${value}` : prefix

// "the Roadmap", but "The Situation Report" stays as it is.
const theDocument = (name: string | null) =>
	!name ? 'a document' : /^the\s/i.test(name) ? name : `the ${name}`

// What a tool call did, in words: the tool's name as a phrase, with its key
// input, and the input worth reading in full, such as the SQL.
export function describeTool(
	agent: CrewKey,
	tool: string,
	input: unknown
): { title: StepTitle; detail: string | null } {
	const args: Args = input && typeof input === 'object' ? (input as Args) : {}
	const detail = (key: string) => {
		const value = args[key]
		return typeof value === 'string' && value.trim()
			? clip(value, DETAIL_MAX)
			: null
	}
	const step = (phrase: Phrase, full: string | null = null) => ({
		title: titleOf(phrase),
		detail: full,
	})
	switch (tool) {
		case 'run_sql':
			return step(['Running', 'Ran', 'run', 'a query'], detail('query'))
		case 'activity_between': {
			const [since, until] = [day(args, 'since'), day(args, 'until')]
			return step([
				'Counting',
				'Counted',
				'count',
				since && until ? `activity from ${since} to ${until}` : 'activity',
			])
		}
		case 'post_to_common_room':
			return step(
				['Posting', 'Posted', 'post', 'in the Common Room'],
				detail('body')
			)
		case 'post_to_room':
			return step(
				['Posting', 'Posted', 'post', `in the ${roomNames[roomOf(agent)]}`],
				detail('body')
			)
		case 'reply_in_thread':
			return step(
				['Replying', 'Replied', 'reply', 'in a side-thread'],
				detail('body')
			)
		case 'pass_note': {
			const to = crewKeys.find((key) => handleOf(key) === args.to)
			return step(
				[
					'Passing',
					'Passed',
					'pass',
					to ? `a note to ${displayName(to)}` : 'a note',
				],
				detail('body')
			)
		}
		case 'bring_to_admin':
			return step(
				[
					'Bringing',
					'Brought',
					'bring',
					named('you a card', text(args, 'title')),
				],
				detail('body')
			)
		case 'propose_change':
			return step(
				[
					'Proposing',
					'Proposed',
					'propose',
					named('a change', text(args, 'title')),
				],
				detail('why')
			)
		case 'propose_charter':
			return step(
				[
					'Proposing',
					'Proposed',
					'propose',
					`a ${args.kind === 'lesson' ? 'lesson' : 'principle'} for the charter`,
				],
				detail('text')
			)
		case 'read_room':
			return step(['Reading', 'Read', 'read', 'the room'])
		case 'read_document': {
			const room = text(args, 'room')
			const where =
				room && room in roomNames
					? ` in the ${roomNames[room as keyof typeof roomNames]}`
					: ''
			return step([
				'Reading',
				'Read',
				'read',
				`${theDocument(text(args, 'name'))}${where}`,
			])
		}
		case 'write_document':
			return step(
				['Saving', 'Saved', 'save', theDocument(text(args, 'name'))],
				detail('summary')
			)
		case 'add_todo':
			return step([
				'Adding',
				'Added',
				'add',
				named('a to-do', text(args, 'text')),
			])
		case 'update_todo':
			return args.done === true
				? step(['Ticking off', 'Ticked off', 'tick off', 'a to-do'])
				: step(['Updating', 'Updated', 'update', 'a to-do'])
		case 'remember':
			return step(['Saving', 'Saved', 'save', 'a memory'], detail('text'))
		case 'forget':
			return step(['Forgetting', 'Forgot', 'forget', 'a memory'])
		case 'add_open_item':
			return step([
				'Adding',
				'Added',
				'add',
				named('an open item', text(args, 'title')),
			])
		case 'close_open_item':
			return step(['Closing', 'Closed', 'close', 'an open item'])
		case 'write_brief':
			return step([
				'Writing',
				'Wrote',
				'write',
				named('the weekly brief', text(args, 'title')),
			])
		case 'start_meeting':
			return step(['Starting', 'Started', 'start', 'the weekly meeting'])
		case 'close_meeting':
			return step(['Closing', 'Closed', 'close', 'the weekly meeting'])
		case 'note_playbook':
			return step(
				[
					'Noting',
					'Noted',
					'note',
					`a ${args.kind === 'chart' ? 'chart' : 'metric'} for the playbook`,
				],
				detail('text')
			)
		case 'file_report':
			return step([
				'Filing',
				'Filed',
				'file',
				named('the pre-meeting report', text(args, 'title')),
			])
		case 'look_at_screen': {
			const sketch = number(args, 'sketch')
			const url = text(args, 'url')
			return step(
				[
					'Looking',
					'Looked',
					'look',
					sketch !== null
						? `at sketch ${sketch}`
						: url
							? `at ${url}`
							: 'at a screen',
				],
				detail('question')
			)
		}
		case 'sketch_screens': {
			const count = Array.isArray(args.proposals) ? args.proposals.length : 0
			return step([
				'Sketching',
				'Sketched',
				'sketch',
				named(
					count === 1 ? 'a screen' : count ? `${count} screens` : 'screens',
					text(args, 'title')
				),
			])
		}
		case 'read_sketch':
			return step([
				'Reading',
				'Read',
				'read',
				`sketch ${number(args, 'id') ?? ''}`.trim(),
			])
		case 'read_issue':
			return step(['Reading', 'Read', 'read', issue(args, 'number', 'issue')])
		case 'list_milestones':
			return step(['Listing', 'Listed', 'list', 'the milestones'])
		case 'list_epics':
			return step(['Listing', 'Listed', 'list', 'the epics'])
		case 'github_changes_since': {
			const since = day(args, 'since')
			return step([
				'Checking',
				'Checked',
				'check',
				since ? `GitHub for changes since ${since}` : 'GitHub for changes',
			])
		}
		case 'draft_issue':
			return step(
				[
					'Drafting',
					'Drafted',
					'draft',
					named('an issue', text(args, 'title')),
				],
				detail('why')
			)
		case 'draft_milestone':
			return step(
				[
					'Drafting',
					'Drafted',
					'draft',
					named('a milestone', text(args, 'title')),
				],
				detail('why')
			)
		case 'draft_comment':
			return step(
				[
					'Drafting',
					'Drafted',
					'draft',
					`a comment on ${issue(args, 'issue', 'an issue')}`,
				],
				detail('body')
			)
		case 'edit_issue':
			return step(['Editing', 'Edited', 'edit', issue(args, 'number', 'issue')])
		case 'edit_milestone': {
			const id = number(args, 'number')
			return step([
				'Editing',
				'Edited',
				'edit',
				id === null ? 'a milestone' : `milestone ${id}`,
			])
		}
		case 'note_writing_style':
			return step(
				['Noting', 'Noted', 'note', 'how you like issues written'],
				detail('text')
			)
		default:
			return step(['Using', 'Used', 'use', tool.replaceAll('_', ' ')])
	}
}

function issue(args: Args, key: string, fallback: string) {
	const id = number(args, key)
	return id === null ? fallback : `#${id}`
}

// A failed tool call's result is the error, as text content.
export function errorText(result: unknown): string | null {
	if (typeof result === 'string') return clip(result, ERROR_MAX) || null
	if (!result || typeof result !== 'object') return null
	const content = (result as { content?: unknown }).content
	if (!Array.isArray(content)) return null
	const message = content
		.flatMap((block: unknown) =>
			block &&
			typeof block === 'object' &&
			'text' in block &&
			typeof block.text === 'string'
				? [block.text]
				: []
		)
		.join(' ')
	return message.trim() ? clip(message, ERROR_MAX) : null
}

// The step change one Flue event makes, or null for an event that is not a
// step: only tools the model called, and its thinking.
export function stepChange(
	agent: CrewKey,
	event: FlueObservation
): StepChange | null {
	switch (event.type) {
		case 'tool_start': {
			if (event.origin && event.origin !== 'model') return null
			return {
				type: 'tool-start',
				id: event.toolCallId,
				...describeTool(agent, event.toolName, event.args),
				at: event.timestamp,
			}
		}
		case 'tool': {
			if (event.origin && event.origin !== 'model') return null
			return {
				type: 'tool-end',
				id: event.toolCallId,
				title: describeTool(agent, event.toolName, undefined).title,
				failed: event.isError,
				error: event.isError ? errorText(event.result) : null,
				ms: event.durationMs,
				at: event.timestamp,
			}
		}
		case 'thinking_start':
			return {
				type: 'thinking-start',
				id: thinkingId(event),
				at: event.timestamp,
			}
		case 'thinking_end':
			return {
				type: 'thinking-end',
				id: thinkingId(event),
				text: event.content,
				at: event.timestamp,
			}
		default:
			return null
	}
}

// Thinking blocks are told apart by their turn and their place in the
// model's reply.
const thinkingId = (event: { turnId?: string; contentIndex?: number }) =>
	`${event.turnId ?? 'turn'}:${event.contentIndex ?? 0}`

const THINKING: StepTitle = {
	running: 'Thinking',
	done: 'Thought',
	failed: 'Thought',
}

// A run's steps after one change. The list keeps the latest MAX_STEPS steps
// and counts the ones it drops.
export function applyStep(run: RunSteps, change: StepChange): RunSteps {
	const index = run.steps.findIndex((step) => step.id === change.id)
	const current = index === -1 ? null : run.steps[index]
	switch (change.type) {
		case 'tool-start':
			if (current) return run
			return add(run, {
				id: change.id,
				kind: 'tool',
				state: 'running',
				title: change.title,
				detail: change.detail,
				error: null,
				at: change.at,
				ms: null,
			})
		case 'tool-end': {
			const ended: RunStepType = {
				...(current ?? {
					id: change.id,
					kind: 'tool',
					title: change.title,
					detail: null,
					at: change.at,
				}),
				state: change.failed ? 'failed' : 'done',
				error: change.error,
				ms: change.ms,
			}
			return current
				? { ...run, steps: run.steps.with(index, ended) }
				: add(run, ended)
		}
		case 'thinking-start':
			if (current) return run
			return add(run, {
				id: change.id,
				kind: 'thinking',
				state: 'running',
				title: THINKING,
				detail: null,
				error: null,
				at: change.at,
				ms: null,
			})
		case 'thinking-end': {
			const thought = clip(change.text, THINKING_MAX)
			if (!thought) {
				return current ? { ...run, steps: run.steps.toSpliced(index, 1) } : run
			}
			const started = current?.at ?? change.at
			const ended: RunStepType = {
				id: change.id,
				kind: 'thinking',
				state: 'done',
				title: THINKING,
				detail: thought,
				error: null,
				at: started,
				ms: Math.max(0, Date.parse(change.at) - Date.parse(started)),
			}
			return current
				? { ...run, steps: run.steps.with(index, ended) }
				: add(run, ended)
		}
	}
}

function add(run: RunSteps, step: RunStepType): RunSteps {
	const steps = [...run.steps, step]
	const over = steps.length - MAX_STEPS
	return over > 0
		? { steps: steps.slice(over), dropped: run.dropped + over }
		: { steps, dropped: run.dropped }
}
