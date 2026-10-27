import { defineTool } from '@flue/runtime'
import * as v from 'valibot'
import { crew, type CrewKey, type StackItemType } from '../../shared/crew'
import { TEAM } from '../../worker/crew/room'
import { roomFor, wake } from '../crew'

const Text = v.pipe(v.string(), v.trim(), v.minLength(1))
const Label = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(24))

const defaultActions: Record<
	'decide' | 'confirm' | 'know' | 'escalate',
	StackItemType['actions']
> = {
	decide: [
		{ id: 'yes', label: 'Yes' },
		{ id: 'no', label: 'No' },
	],
	confirm: [
		{ id: 'right', label: "That's right" },
		{ id: 'undo', label: 'Undo it' },
	],
	know: [],
	escalate: [
		{ id: 'will-look', label: "I'll look into it" },
		{ id: 'not-now', label: 'Not now' },
	],
}

// Tools every bridge agent has: bringing things to the admin's stack, and
// proposing what the bridge should remember about them.
export function bridgeTools(agent: CrewKey) {
	const bringToAdmin = defineTool({
		name: 'bring_to_admin',
		description: `Put an item in the admin's stack, the short list they read instead of the whole room. Kinds:
- decide: you need their call, and the matter is on hold until they answer. Give 2 or 3 short options, or leave them out for Yes and No.
- confirm: you already acted in their stead, and ask whether that was right. Only for reversible actions that the charter clearly covers.
- know: worth knowing, nothing to answer. One or two sentences.
- escalate: it needs more than the crew has, such as an engineer or a Claude Code session. Write the body as a brief that a person could act on cold.
Their answer comes back to you.`,
		input: v.object({
			kind: v.picklist(['decide', 'confirm', 'know', 'escalate']),
			title: v.pipe(Text, v.maxLength(140)),
			body: v.pipe(Text, v.maxLength(4000)),
			options: v.optional(
				v.pipe(v.array(Label), v.minLength(2), v.maxLength(3))
			),
		}),
		durable: true,
		async run({ data, step }) {
			const id = await step.do('bring', async () =>
				(await roomFor()).bringToAdmin({
					author: agent,
					kind: data.kind,
					title: data.title,
					body: data.body,
					actions: data.options
						? data.options.map((label, index) => ({
								id: `option-${index + 1}`,
								label,
							}))
						: defaultActions[data.kind],
				})
			)
			return { output: { id } }
		},
	})

	const proposeCharter = defineTool({
		name: 'propose_charter',
		description:
			'Propose an entry for the charter, the bridge\'s memory of the admin. A principle is about their philosophy, strategy or taste; a lesson is how they decide in a kind of situation ("When X, they prefer Y, because Z"). It counts only after they keep it, so never act on a proposal as if it were kept.',
		input: v.object({
			kind: v.picklist(['principle', 'lesson']),
			text: v.pipe(Text, v.maxLength(300)),
			why: v.pipe(Text, v.maxLength(600)),
		}),
		durable: true,
		async run({ data, step }) {
			const id = await step.do('propose', async () =>
				(await roomFor()).proposeCharter({ author: agent, ...data })
			)
			return { output: { stackItem: id } }
		},
	})

	return [bringToAdmin, proposeCharter]
}

// Riker's weekly cycle.
export function rikerTools() {
	const writeBrief = defineTool({
		name: 'write_brief',
		description:
			"Put this week's brief at the top of the admin's stack. Markdown: what happened, what is open with them, what you propose to change, and the agenda for the weekly meeting.",
		input: v.object({
			title: v.pipe(Text, v.maxLength(140)),
			body: v.pipe(Text, v.maxLength(12000)),
		}),
		durable: true,
		async run({ data, step }) {
			const id = await step.do('brief', async () =>
				(await roomFor()).recordBrief({ author: 'riker', ...data })
			)
			return { output: { stackItem: id } }
		},
	})

	const closeMeeting = defineTool({
		name: 'close_meeting',
		description:
			'End the weekly meeting with the admin. Posts the minutes in the crew room: decisions, charter changes, and the directives each agent will get from you next.',
		input: v.object({ minutes: v.pipe(Text, v.maxLength(6000)) }),
		durable: true,
		async run({ data, step }) {
			await step.do('close', async () => {
				const room = await roomFor()
				await room.closeMeeting()
				await room.postFromAgent({
					agent: 'riker',
					body: `**Minutes of this week's meeting**\n\n${data.minutes}`,
					card: null,
					place: 'room',
					conversation: TEAM,
				})
				return true
			})
			return 'The meeting is closed and the minutes are in the room.'
		},
	})

	return [writeBrief, closeMeeting]
}

const Cell = v.union([v.string(), v.number(), v.null()])

// Data's exhibits: a chart the app draws, or a self-contained HTML explorer.
export function dataTools() {
	const postExhibit = defineTool({
		name: 'post_exhibit',
		description: `Post a message in the crew room with an exhibit attached. Give exactly one of:
- chart: a line or bar chart. "x" names the row key for the x axis; each series names a numeric row key. At most 400 rows.
- html: a complete, self-contained HTML document for an interactive explorer (tables, filters, small charts). Inline all data, CSS and JS; it runs in a sandbox with no network and no access to the app.`,
		input: v.pipe(
			v.object({
				body: v.pipe(Text, v.maxLength(4000)),
				title: v.pipe(Text, v.maxLength(120)),
				chart: v.optional(
					v.object({
						type: v.picklist(['line', 'bar']),
						x: Text,
						series: v.pipe(
							v.array(v.object({ key: Text, label: Text })),
							v.minLength(1),
							v.maxLength(6)
						),
						rows: v.pipe(v.array(v.record(v.string(), Cell)), v.maxLength(400)),
					})
				),
				html: v.optional(v.pipe(Text, v.maxLength(200_000))),
			}),
			v.check(
				(input) => (input.chart === undefined) !== (input.html === undefined),
				'Give exactly one of chart or html'
			)
		),
		durable: true,
		async run({ data, step }) {
			const { message, wake: wakes } = await step.do('post', async () =>
				(await roomFor()).postFromAgent({
					agent: 'data',
					body: data.body,
					card: null,
					place: 'room',
					conversation: TEAM,
					exhibit: data.chart
						? { kind: 'chart', title: data.title, chart: data.chart }
						: { kind: 'html', title: data.title, html: data.html ?? '' },
				})
			)
			await step.do('wake', () => wake(wakes, crew.data.name).then(() => true))
			return { output: { messageId: message.id } }
		},
	})
	return [postExhibit]
}
