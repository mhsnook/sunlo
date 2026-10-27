import { defineTool } from '@flue/runtime'
import * as v from 'valibot'
import type { ActionType, CrewKey } from '../../shared/crew'
import { BRIDGE } from '../../worker/crew/room'
import { requestReport, roomFor, wake } from '../crew'
import { assertBlocks, Options, Text, toActions } from './posting'

const defaultActions: Record<
	'decide' | 'confirm' | 'know' | 'escalate',
	Array<ActionType>
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

// Tools Riker and Data both have: talking in the Enterprise thread, bringing
// the admin cards there, and proposing what to remember about the admin.
export function bridgeTools(agent: CrewKey) {
	const postToEnterprise = defineTool({
		name: 'post_to_enterprise',
		description:
			'Post a message in the Enterprise thread, where the admin talks with Riker and Data. Answer an <enterprise-message> here. Write @Riker or @Data to hand the other officer the floor.',
		input: v.object({ body: Text }),
		durable: true,
		async run({ data, step }) {
			assertBlocks(data.body)
			const { message, wake: wakes } = await step.do('post', async () =>
				(await roomFor()).postFromAgent({
					agent,
					body: data.body,
					card: null,
					place: 'bridge',
					conversation: BRIDGE,
				})
			)
			await step.do('wake', () =>
				wake(wakes, agent === 'riker' ? 'Riker' : 'Data').then(() => true)
			)
			return { output: { messageId: message.id } }
		},
	})

	const bringToAdmin = defineTool({
		name: 'bring_to_admin',
		description: `Bring the admin a card in the Enterprise thread: the short list they read instead of the whole Conference Room. Kinds:
- decide: you need their call, and the matter is on hold until they answer. Give 2 or 3 short options, or leave them out for Yes and No.
- confirm: you already acted in their stead, and ask whether that was right. Only for reversible actions that the charter clearly covers.
- know: worth knowing, nothing to answer. One or two sentences.
- escalate: it needs more than the crew has, such as an engineer or a Claude Code session. Write the body as a brief that a person could act on cold.
Their answer comes back to you.`,
		input: v.object({
			kind: v.picklist(['decide', 'confirm', 'know', 'escalate']),
			title: v.pipe(Text, v.maxLength(140)),
			body: v.pipe(Text, v.maxLength(4000)),
			options: v.optional(Options),
		}),
		durable: true,
		async run({ data, step }) {
			assertBlocks(data.body)
			const messageId = await step.do('bring', async () =>
				(await roomFor()).bringToAdmin({
					author: agent,
					kind: data.kind,
					title: data.title,
					body: data.body,
					actions: data.options
						? toActions(data.options)
						: defaultActions[data.kind],
				})
			)
			return { output: { messageId } }
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
			const messageId = await step.do('propose', async () =>
				(await roomFor()).proposeCharter({ author: agent, ...data })
			)
			return { output: { messageId } }
		},
	})

	return [postToEnterprise, bringToAdmin, proposeCharter]
}

// Riker's weekly cycle.
export function rikerTools() {
	const writeBrief = defineTool({
		name: 'write_brief',
		description:
			"Post this week's brief in the Enterprise thread. Markdown: what happened, what is open with the admin, what you propose to change, and the agenda for the weekly meeting.",
		input: v.object({
			title: v.pipe(Text, v.maxLength(140)),
			body: v.pipe(Text, v.maxLength(12000)),
		}),
		durable: true,
		async run({ data, step }) {
			assertBlocks(data.body)
			const messageId = await step.do('brief', async () =>
				(await roomFor()).recordBrief({ author: 'riker', ...data })
			)
			return { output: { messageId } }
		},
	})

	const startMeeting = defineTool({
		name: 'start_meeting',
		description:
			'Mark the weekly meeting as started, when the admin asks for it anywhere but the "Start the weekly meeting" button. Then open the meeting in the Enterprise thread with post_to_enterprise.',
		input: v.object({}),
		async run() {
			const start = await (await roomFor()).recordMeetingStart()
			if (!start.started) {
				return 'No weekly meeting is due: there is no brief since the last meeting.'
			}
			if (start.needsReport) await requestReport()
			return start.needsReport
				? 'The meeting is marked as started, and Data is writing the pre-meeting report. Open the meeting in the Enterprise thread.'
				: 'The meeting is marked as started. Open it in the Enterprise thread.'
		},
	})

	const closeMeeting = defineTool({
		name: 'close_meeting',
		description:
			'End the weekly meeting with the admin. Posts the minutes in the Conference Room: decisions, charter changes, and the directives each agent will get from you next.',
		input: v.object({ minutes: v.pipe(Text, v.maxLength(6000)) }),
		durable: true,
		async run({ data, step }) {
			assertBlocks(data.minutes)
			const wakes = await step.do('close', async () => {
				const room = await roomFor()
				await room.closeMeeting()
				const posted = await room.postFromAgent({
					agent: 'riker',
					body: `**Minutes of this week's meeting**\n\n${data.minutes}`,
					card: null,
					place: 'room',
					conversation: BRIDGE,
				})
				return posted.wake
			})
			await step.do('wake', () => wake(wakes, 'Riker').then(() => true))
			return 'The meeting is closed and the minutes are in the Conference Room.'
		},
	})

	return [writeBrief, startMeeting, closeMeeting]
}

// Data's playbook: the metrics the admin likes in each domain, and how they
// like charts drawn. Data keeps it himself; the admin can delete entries.
export function dataTools() {
	const notePlaybook = defineTool({
		name: 'note_playbook',
		description:
			'Add to your playbook. "metric": a metric the admin likes for a domain, such as retention (day-7 returners over signups) or library health. "chart": how they like charts, such as "line charts for anything over time; no pie charts". Note what their reactions tell you, and check the playbook before you choose metrics or draw.',
		input: v.object({
			kind: v.picklist(['metric', 'chart']),
			domain: v.optional(v.pipe(Text, v.maxLength(40))),
			text: v.pipe(Text, v.maxLength(300)),
		}),
		async run({ data }) {
			const id = await (
				await roomFor()
			).remember('data', data.text, {
				kind: data.kind,
				domain: data.domain ?? null,
			})
			return { output: { id } }
		},
	})
	const fileReport = defineTool({
		name: 'file_report',
		description:
			"File the pre-meeting report for this week's meeting: the numbers behind each item on the brief's agenda, with charts or tables where they help, and the caveats. It shows in the Enterprise thread folded, with its title and opening lines, so lead with the finding. Use this whenever the admin asks for a pre-meeting briefing too, so the meeting does not ask for a second one.",
		input: v.object({
			title: v.pipe(Text, v.maxLength(140)),
			body: v.pipe(Text, v.maxLength(12000)),
		}),
		durable: true,
		async run({ data, step }) {
			assertBlocks(data.body)
			const messageId = await step.do('report', async () =>
				(await roomFor()).fileReport(data)
			)
			return { output: { messageId } }
		},
	})
	return [notePlaybook, fileReport]
}
