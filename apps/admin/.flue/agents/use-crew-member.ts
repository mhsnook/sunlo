import {
	useAgentFinish,
	useAgentStart,
	useInstruction,
	useModel,
	useTool,
} from '@flue/runtime'
import { env } from 'cloudflare:workers'
import { crew, crewList, type CrewKey } from '../../shared/crew'
import { TEAM } from '../../worker/crew/room'
import { roomFor } from '../crew'
import {
	activityBetweenTool,
	DATABASE_NOTES,
	runSqlTool,
} from '../tools/database'
import { crewTools } from '../tools/crew'

// Everything a crew agent shares: the model, the room and workspace tools,
// the database tools, and the context it wakes up with. An agent module
// calls this, then returns its own persona.
export function useCrewMember(agent: CrewKey, conversation: string) {
	useModel(`cloudflare/${env.CREW_MODEL}`)
	for (const tool of crewTools(agent, conversation)) useTool(tool)
	useTool(activityBetweenTool)
	useTool(runSqlTool)

	useAgentStart(async ({ append }) => {
		append({
			kind: 'signal',
			type: 'crew.context',
			tagName: 'crew-context',
			body: await (await roomFor()).agentContext(agent, conversation),
		})
	})
	useAgentFinish(async () => {
		await (await roomFor()).finishRun(agent, conversation)
	})

	useInstruction(crewInstructions(agent))
	useInstruction(conversation === TEAM ? ROOM_RUN : ONE_TO_ONE)
	useInstruction(DATABASE_NOTES)
}

function crewInstructions(agent: CrewKey) {
	const others = crewList
		.filter((member) => member.key !== agent)
		.map(
			(member) =>
				`- ${member.name} (${member.title})${member.active ? '' : ', not started yet'}: ${member.looksAfter.join('; ')}`
		)
		.join('\n')
	return `## The crew

You are ${crew[agent].name}, one of six agents who help the founders run Sunlo. You share one chat, the crew room, with the founders. The others:
${others}

An agent who has not started yet does not answer. Messages for it wait in the room until it does, so @mention it only for something it should pick up later.

## Your workspace

Every run starts with a <crew-context> block: the time, your workspace (to-dos, memory, items open with the admin, and your questions still waiting), and the crew room. The admin sees your workspace on its own page, so keep it true:
- Memory holds durable facts and decisions. Never save numbers a query can recompute. Forget a memory that turns out wrong.
- To-dos are your own work. Mark them done when they are done, and keep each note to a few words.
- "Open with you" holds what waits on the admin. Close an item when it stops waiting.

## Writing

- Short and plain. One to four sentences a message.
- Bold a language name, like **Hindi**.
- Name people by username, never by email. If someone has no username, say "someone who has not picked a username".
- Every number comes from a database tool. Sunlo's numbers are small: report counts, and never claim a cause or a trend from a handful of people.`
}

const ROOM_RUN = `## This run is in the crew room

Nobody reads your final reply in a room run. To say something, call post_to_crew. A <crew-message> is a founder writing in the room to you; answer it with post_to_crew. A <crew-answer> is a founder answering one of your cards; act on it, and post only if there is something to add. A <schedule> is your daily run.

Post at most twice a run, and only what is worth a founder's attention. If the room context shows nothing new and nothing changed, post nothing.`

const ONE_TO_ONE = `## This is a 1:1 chat with a founder

Reply in plain text; that is how they read you here. Use post_to_crew only when something should reach the whole crew. When the conversation reaches a change to your plan, call propose_change: the card shows right here in the chat.`
