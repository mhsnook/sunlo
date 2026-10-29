import {
	displayName,
	meetingDue,
	principalOf,
	placeOf,
	roomNames,
	roomOf,
	type CharterEntryType,
	type CommonKnowledgeType,
	type CrewKey,
	type CrewMessageType,
	type DocumentSummaryType,
	type WeeklyType,
	type WorkspaceType,
} from '../../shared/crew'

// Room times for the model: minutes are enough, and UTC is explicit.
export const stamp = (iso: string) =>
	`${iso.slice(0, 16).replace('T', ' ')} UTC`

// One timeline's messages for the model, a line each.
export function timelineText(messages: Array<CrewMessageType>) {
	return messages
		.map((message) => {
			const note =
				message.routing?.kind === 'stack'
					? ' (more coming)'
					: message.routing?.kind === 'room'
						? ' (left in the room)'
						: ''
			const card = message.card
				? message.answer
					? ` [answered: ${message.answer.label}]`
					: ` [waiting for an answer: ${message.card.actions.map((a) => a.label).join(' / ')}]`
				: ''
			return `[${stamp(message.at)}] ${message.authorName}${note}: ${message.body}${card}`
		})
		.join('\n')
}

// The messages in one timeline that a run has not read. `since` is false the
// first time the agent reads the timeline, when these are the latest ones.
export type UnreadTimeline = {
	since: boolean
	messages: Array<CrewMessageType>
}

export type BriefingInput = {
	now: string
	agent: CrewKey
	commonKnowledge: Array<CommonKnowledgeType>
	sitrep: Sitrep | null
	// The agent's own room's documents, without their text.
	documents: Array<DocumentSummaryType>
	workspace: WorkspaceType
	// The cards in the agent's own room.
	cards: {
		waiting: Array<CrewMessageType>
		answered: Array<CrewMessageType>
	}
	// For the Command room's members only.
	command: {
		charter: Array<CharterEntryType>
		weekly: WeeklyType
		meetingStartedAt: string | null
	} | null
	unread: { common: UnreadTimeline; own: UnreadTimeline }
}

type Sitrep = Pick<DocumentSummaryType, 'revision' | 'byName' | 'at'> & {
	text: string
}

// The <crew-context> every run starts with.
export function briefingText(input: BriefingInput) {
	const room = roomNames[roomOf(input.agent)]
	const sections = [
		`It is now ${stamp(input.now)}.`,
		commonKnowledgeText(input.commonKnowledge),
		sitrepText(input.sitrep),
	]
	if (input.command) sections.push(commandText(input.command, input.now))
	sections.push(
		documentsText(room, input.documents),
		cardsText(room, input.cards),
		workspaceText(input.workspace),
		unreadText('The Common Room', input.unread.common),
		unreadText(`The ${room}`, input.unread.own)
	)
	return sections.join('\n\n')
}

function unreadText(name: string, timeline: UnreadTimeline) {
	return [
		timeline.since
			? `## ${name} since your last run`
			: `## ${name}, latest messages`,
		timelineText(timeline.messages) || '(nothing new)',
	].join('\n\n')
}

export function sitrepText(sitrep: Sitrep | null) {
	return [
		'## The Situation Report: where Sunlo and each room stand now',
		sitrep?.at
			? `${sitrep.text}\n\n(Revision ${sitrep.revision}, saved by ${sitrep.byName}, ${stamp(sitrep.at)}.)`
			: '(Nobody has written it yet.)',
	].join('\n\n')
}

export function documentsText(
	room: string,
	documents: Array<DocumentSummaryType>
) {
	const lines = documents.map((doc) =>
		doc.at
			? `- ${doc.name}: revision ${doc.revision}, saved by ${doc.byName}, ${stamp(doc.at)}`
			: `- ${doc.name}: not written yet`
	)
	return [`## The ${room}'s documents`, lines.join('\n') || '(none yet)'].join(
		'\n\n'
	)
}

function commonKnowledgeText(entries: Array<CommonKnowledgeType>) {
	return [
		'## Common Knowledge: what the admin wants every agent to know',
		entries.map((entry) => `- ${entry.text}`).join('\n') || '(empty)',
	].join('\n\n')
}

function cardsText(room: string, cards: BriefingInput['cards']) {
	const waiting = cards.waiting
		.map(
			(message) =>
				`- [${message.card?.kind}, from ${message.authorName}] ${message.card?.title ?? message.body}`
		)
		.join('\n')
	const answered = cards.answered
		.map(
			(message) =>
				`- ${message.card?.title ?? message.body}: "${message.answer?.label}"`
		)
		.join('\n')
	return [
		`## Cards in the ${room}`,
		`Waiting on the admin:\n${waiting || '(none)'}`,
		`Recently answered:\n${answered || '(none)'}`,
	].join('\n\n')
}

// The Command room's memory of the admin, and the weekly cycle.
function commandText(
	command: NonNullable<BriefingInput['command']>,
	now: string
) {
	const entries = (status: CharterEntryType['status']) =>
		command.charter
			.filter((entry) => entry.status === status)
			.map((entry) => `- [${entry.kind} ${entry.id}] ${entry.text}`)
			.join('\n')
	const { weekly, meetingStartedAt } = command
	const firstOfficer = displayName(principalOf('command'))
	const meeting = meetingStartedAt
		? `The weekly meeting is in progress in the Command room: the admin started it at ${stamp(meetingStartedAt)}. Go through the agenda one item at a time, and call close_meeting with the minutes when it is done.`
		: meetingDue(weekly)
			? `The weekly meeting is due: ${firstOfficer} wrote the brief at ${stamp(weekly.briefAt ?? now)}, and the admin has not met with ${firstOfficer} since. It comes before anything else. Something truly critical becomes item 1 of the meeting; it does not replace the meeting.`
			: `The last weekly meeting was ${weekly.meetingAt ? stamp(weekly.meetingAt) : 'never'}.`
	return [
		'## The charter: what the admin has told the Command room about themselves',
		entries('kept') || '(nothing kept yet)',
		'Proposed, waiting for the admin:',
		entries('proposed') || '(none)',
		'## The weekly cycle',
		`${meeting} The admin's time zone is ${weekly.timezone}.`,
	].join('\n\n')
}

function workspaceText(workspace: WorkspaceType) {
	const todos = workspace.todos
		.map(
			(t) =>
				`- [${t.id}]${t.done ? ' (done)' : ''} ${t.text}${t.note ? ` — ${t.note}` : ''}`
		)
		.join('\n')
	const memory = workspace.memory
		.map(
			(m) =>
				`- [${m.id}]${m.kind === 'fact' ? '' : ` (${m.kind}${m.domain ? `, ${m.domain}` : ''})`} ${m.text}`
		)
		.join('\n')
	const open = workspace.openItems
		.map((o) => `- [${o.id}] ${o.title}${o.tag ? ` (${o.tag})` : ''}`)
		.join('\n')
	// Cards in the agent's own room are listed with the room's cards already.
	const ownRoom = placeOf(roomOf(workspace.agent))
	const waiting = workspace.cards
		.filter((c) => !c.answer && c.place !== ownRoom)
		.map((c) => `- ${stamp(c.at)}: ${c.card?.title ?? c.body}`)
		.join('\n')
	return [
		'## Your workspace',
		`To-do:\n${todos || '(none)'}`,
		`Memory:\n${memory || '(none)'}`,
		`Open with the admin:\n${open || '(none)'}`,
		`Your Common Room questions still waiting for an answer:\n${waiting || '(none)'}`,
	].join('\n\n')
}
