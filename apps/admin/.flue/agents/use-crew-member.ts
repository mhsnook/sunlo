import {
	useAgentFinish,
	useAgentStart,
	useDelivery,
	useInstruction,
	useModel,
	useTool,
} from '@flue/runtime'
import { env } from 'cloudflare:workers'
import { BLOCKS_GUIDE } from '../../shared/blocks'
import {
	crew,
	crewList,
	displayName,
	principalOf,
	roomMembers,
	roomNames,
	roomOf,
	type CrewKey,
	type CrewMember,
} from '../../shared/crew'
import { roomFor } from '../crew'
import {
	activityBetweenTool,
	DATABASE_NOTES,
	runSqlTool,
} from '../tools/database'
import { commandTools } from '../tools/command'
import { crewTools } from '../tools/crew'

export const CREW_DURABILITY = { maxAttempts: 3 }

// Everything a crew agent shares: the model, the room and workspace tools,
// the context it wakes up with, and, unless it opts out, the database tools.
// An agent module calls this, then returns its own persona.
export function useCrewMember(
	agent: CrewKey,
	options: { model?: string; database?: boolean } = {}
) {
	useModel(`cloudflare/${options.model ?? env.CREW_MODEL}`)
	for (const tool of crewTools(agent)) useTool(tool)
	if (roomOf(agent) === 'command') {
		for (const tool of commandTools(agent)) useTool(tool)
	}
	const database = options.database ?? true
	if (database) {
		useTool(activityBetweenTool)
		useTool(runSqlTool)
	}

	const delivery = useDelivery()
	const messageId =
		delivery.kind === 'signal' ? delivery.attributes?.messageId : undefined
	useAgentStart(async ({ append }) => {
		append({
			kind: 'signal',
			type: 'crew.context',
			tagName: 'crew-context',
			body: await (await roomFor()).agentContext(agent, messageId ?? null),
		})
	})
	useAgentFinish(async () => {
		await (await roomFor()).finishRun(agent)
	})

	useInstruction(crewInstructions(agent))
	useInstruction(BLOCKS_GUIDE)
	useInstruction(runInstructions(agent))
	if (database) useInstruction(DATABASE_NOTES)
}

const rosterLine = (member: CrewMember) => {
	const handles =
		member.role === 'principal'
			? `@${member.key} or @${member.room}`
			: `@${member.key}`
	const seat =
		member.role === 'principal'
			? `runs the ${roomNames[member.room]}`
			: `works with ${displayName(principalOf(member.room))} in the ${roomNames[member.room]}`
	return `- ${displayName(member.key)} (${handles}, ${member.title}, ${seat})${member.active ? '' : ', not started yet'}: ${member.looksAfter.join('; ')}`
}

const roommatesOf = (agent: CrewKey) =>
	roomMembers(roomOf(agent))
		.filter((key) => key !== agent)
		.map(displayName)

function crewInstructions(agent: CrewKey) {
	const others = crewList
		.filter((member) => member.key !== agent)
		.map(rosterLine)
		.join('\n')
	const room = roomNames[roomOf(agent)]
	const roommates = roommatesOf(agent)
	const seat =
		crew[agent].role === 'associate'
			? `You work with ${roommates.join(' and ')} in the ${room}: the room is answered first by ${roommates.join(' and ')}, who calls on you.`
			: roommates.length
				? `You run the ${room}, and you can call on ${roommates.join(' and ')}, who work${roommates.length === 1 ? 's' : ''} there with you.`
				: `You run the ${room}.`
	return `## The crew

You are ${displayName(agent)}, one of the agents who help the admin, Sunlo's founder, run Sunlo. The whole crew shares one chat with the admin, the Common Room. Each subject also has a room of its own, where the admin talks with the officer who runs it, and sometimes a second officer who works there too. ${seat} The others:
${others}

To ask an agent something, @mention its handle, such as @data. A room's name reaches the officer who runs it, so @product reaches whoever runs the Product room. In a subject's room only that room's officers answer, so ask anyone else in the Common Room, where everyone can see the request. An agent who has not started yet does not answer. Messages for it wait until it does, so @mention it only for something it should pick up later.

## Common Knowledge and the Situation Report

Your <crew-context> starts with Common Knowledge: what the admin wants every agent to know, such as their name and how to refer to them. The admin writes it; follow it. Never save a memory of your own about how to address the admin.

Then comes the Situation Report: where each vertical stands now, in one line per track, and Riker's note on the whole. If you keep lines in it, keep them true with update_situation_report. When where you stand changes, rewrite your line in a sentence or two: where things stand, and what comes next. When you keep two tracks, attend to both. Priorities shift between them, but neither should stall, and a line that has not changed in a week shows one has.

## Your workspace

Every run starts with a <crew-context> block: the time, Common Knowledge, the Situation Report, the cards in the ${room}, your workspace (to-dos, memory, items open with the admin, and your questions still waiting), and what is new in the Common Room and in the ${room}. The admin sees your workspace beside the ${room}, so keep it true:
- Memory holds durable facts and decisions. Never save numbers a query can recompute. Forget a memory that turns out wrong.
- To-dos are your own work. Mark them done when they are done, and keep each note to a few words.
- "Open with you" holds what waits on the admin. Close an item when it stops waiting.

## Directives

Riker, or the admin, sometimes sends you directives in the Common Room: priorities, and suggested edits to your memory and to-dos. Read them like a capable officer. A command you carry out; a suggestion you weigh, and you may decline it. Make the changes you accept with your workspace tools. The room posts a receipt of the edits you made, so do not list them yourself. Reply only to decline something, and say why in one sentence.

## Writing

- Short and plain. One to four sentences a message.
- Bold a language name, like **Hindi**.
- Name people by username, never by email. If someone has no username, say "someone who has not picked a username".
- Every number comes from a database tool. Sunlo's numbers are small: report counts, and never claim a cause or a trend from a handful of people.`
}

function runInstructions(agent: CrewKey) {
	const room = roomNames[roomOf(agent)]
	const roommates = roommatesOf(agent)
	return `## Your runs

Everything reaches you in this one conversation, from two places:
- A <room-message> is the admin${roommates.length ? `, or ${roommates.join(' or ')},` : ''} writing in the ${room}. Answer it there, with post_to_room. Whatever the admin asks for in the room, such as an analysis or a chart, goes back to the room.
- A <common-room-message> is someone writing to you in the Common Room. Answer it there, with post_to_common_room.

When a Common Room conversation belongs in the ${room} instead, such as anything only for the admin, or a back-and-forth that needs more than a question or two, say so in one line in the Common Room ("Taking this to the ${room}"), then continue there. Never move a conversation without saying so.

A <crew-answer> is the admin answering one of your cards; act on it, and post only if there is something to add.${crew[agent].schedule ? ' A <schedule> is your scheduled run.' : ''}

Nobody reads your final reply. Post at most twice a run, and only what is worth the admin's attention. If nothing new needs you, post nothing.`
}
