import { defineTool } from '@flue/runtime'
import * as v from 'valibot'
import {
	crewKeys,
	displayName,
	handleOf,
	resolveHandle,
} from '../../shared/crew'
import { requestReport, roomFor, wake } from '../crew'
import { assertBlocks, Text } from './posting'

// The weekly cycle, which the Command room's principal runs.
export function firstOfficerTools() {
	const writeBrief = defineTool({
		name: 'write_brief',
		description:
			"Post this week's brief in the Command room. Markdown: what happened, what is open with the admin, what you propose to change, and the agenda for the weekly meeting.",
		input: v.object({
			title: v.pipe(Text, v.maxLength(140)),
			body: v.pipe(Text, v.maxLength(12000)),
		}),
		durable: true,
		async run({ data, step }) {
			assertBlocks(data.body)
			const messageId = await step.do('brief', async () =>
				(await roomFor()).recordBrief({ author: 'command-1', ...data })
			)
			return { output: { messageId } }
		},
	})

	const startMeeting = defineTool({
		name: 'start_meeting',
		description:
			'Mark the weekly meeting as started, when the admin asks for it anywhere but the "Start the weekly meeting" button. Then open the meeting in the Command room with post_to_room.',
		input: v.object({}),
		async run() {
			const start = await (await roomFor()).recordMeetingStart()
			if (!start.started) {
				return 'No weekly meeting is due: there is no brief since the last meeting.'
			}
			if (start.needsReport) await requestReport()
			return start.needsReport
				? `The meeting is marked as started, and ${displayName('command-2')} is writing the pre-meeting report. Open the meeting in the Command room.`
				: 'The meeting is marked as started. Open it in the Command room.'
		},
	})

	const closeMeeting = defineTool({
		name: 'close_meeting',
		description:
			'End the weekly meeting with the admin, once they say it is done. Posts the minutes in the Common Room, then one message to each crew member you name, with their directive: the priority in a sentence, and any suggested edits as a short list, each marked as a command or a suggestion.',
		input: v.object({
			minutes: v.pipe(Text, v.maxLength(6000)),
			directives: v.optional(
				v.array(
					v.object({
						// A handle, such as "data", as the roster in the prompt gives it.
						to: v.picklist(crewKeys.map(handleOf)),
						text: v.pipe(Text, v.maxLength(2000)),
					})
				),
				[]
			),
		}),
		durable: true,
		async run({ data, step }) {
			assertBlocks(data.minutes)
			const wakes = await step.do('close', async () =>
				(await roomFor()).closeMeeting({
					minutes: data.minutes,
					directives: data.directives.flatMap((directive) => {
						const to = resolveHandle(directive.to)
						return to ? [{ to, text: directive.text }] : []
					}),
				})
			)
			await step.do('wake', () =>
				wake(wakes, displayName('command-1')).then(() => true)
			)
			return 'The meeting is closed, and the minutes and directives are in the Common Room.'
		},
	})

	return [writeBrief, startMeeting, closeMeeting]
}

// The science officer's playbook: the metrics the admin likes in each
// domain, and how they like charts drawn. It keeps the playbook itself; the
// admin can delete entries.
export function scienceOfficerTools(thread: string | null) {
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
			).remember(
				'command-2',
				data.text,
				{ kind: data.kind, domain: data.domain ?? null },
				thread
			)
			return { output: { id } }
		},
	})
	const fileReport = defineTool({
		name: 'file_report',
		description:
			"File the pre-meeting report for this week's meeting: the numbers behind each item on the brief's agenda, with charts or tables where they help, and the caveats. It shows in the Command room folded, with its title and opening lines, so lead with the finding. Use this whenever the admin asks for a pre-meeting briefing too, so the meeting does not ask for a second one.",
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
			// The report first, then the first officer's read of it.
			await step.do('first-officer', () =>
				wake(
					[
						{
							agent: 'command-1',
							body: `${displayName('command-2')} filed the pre-meeting report: "${data.title}". Read it in the thread and comment on what it means for the agenda.`,
							messageId,
							place: 'room:command',
						},
					],
					displayName('command-2')
				).then(() => true)
			)
			return { output: { messageId } }
		},
	})
	return [notePlaybook, fileReport]
}
