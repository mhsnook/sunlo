import { dispatch, observe, type Agent } from '@flue/runtime'
import { getAgentByName } from 'agents'
import { env } from 'cloudflare:workers'
import { isCrewKey, roomOfPlace, type CrewKey } from '../shared/crew'
import {
	CONVERSATION,
	ROOM,
	type CrewRoom,
	type Wake,
} from '../worker/crew/room'
import { Command1 } from './agents/command-1'
import { Command2 } from './agents/command-2'
import { Product1 } from './agents/product-1'
import { Product2 } from './agents/product-2'

export const roomFor = () =>
	getAgentByName(env.CREW_ROOM as DurableObjectNamespace<CrewRoom>, ROOM)

// The crew members that run. A function, not a constant: agent modules
// import this file, and the agent they export is not initialised yet while
// this module evaluates.
const crewAgents = (): Partial<Record<CrewKey, Agent>> => ({
	'command-1': Command1,
	'command-2': Command2,
	'product-1': Product1,
	'product-2': Product2,
})

// Each side-thread has a conversation of its own, so a favour stays out of
// the helper's running memory. Its first dispatch creates it with this, as
// initialData, which the agent reads with useInitialData for good.
export type ConversationData = { thread: string }
export const threadConversation = (root: string) => `thread:${root}`
const threadOf = (conversation: string | undefined) =>
	conversation?.startsWith('thread:') ? conversation.slice(7) : null

// A run that fails or is aborted settles without useAgentFinish, so the room
// hears about it here instead.
observe((event) => {
	if (event.type !== 'submission_settled' || event.outcome === 'completed') {
		return
	}
	const thread = threadOf(event.instanceId)
	if (event.instanceId !== CONVERSATION && !thread) return
	// Each agent's Flue identity is its crew key.
	const key = event.agentName
	if (key && isCrewKey(key)) {
		void roomFor().then((room) =>
			thread ? room.failThreadRun(thread) : room.failRun(key)
		)
	}
})

// Delivers messages to the agents CLEF or an @mention woke. The message is
// already in its timeline, so a dispatch that fails is logged, not thrown.
// A <common-room-message> came from the Common Room, and a <room-message>
// from the agent's own room.
export async function wake(wakes: Array<Wake>, from: string) {
	await Promise.all(
		wakes.map(({ agent, body, messageId, place, thread }) => {
			// The helper works in the thread's own conversation; the asker hears
			// a reply in its main one.
			const inThread = thread?.to === 'helper' ? thread.root : null
			const type = inThread
				? 'thread.message'
				: thread
					? 'thread.reply'
					: roomOfPlace(place)
						? 'room.message'
						: 'common-room.message'
			const attributes = {
				from,
				messageId,
				...(thread ? { thread: thread.root } : {}),
			}
			return deliver(agent, type, body, attributes, inThread).catch(
				(error: unknown) => console.error(`Could not wake ${agent}`, error)
			)
		})
	)
}

// Asks command-2 for the pre-meeting report, when a meeting starts without
// one.
export const requestReport = () =>
	deliver(
		'command-2',
		'meeting.report',
		'The weekly meeting just started, and there is no pre-meeting report for it yet. Write one now with file_report.'
	)

// One signal to an agent's running memory. `type` "common-room.message"
// arrives as a <common-room-message> tag.
export async function deliver(
	agent: CrewKey,
	type: string,
	body: string,
	attributes?: Record<string, string>,
	// A side-thread's first message, to deliver into that thread's
	// conversation instead of the agent's main one.
	thread: string | null = null
) {
	const target = crewAgents()[agent]
	if (!target) return
	await dispatch(target, {
		id: thread ? threadConversation(thread) : CONVERSATION,
		...(thread ? { initialData: { thread } satisfies ConversationData } : {}),
		message: {
			kind: 'signal',
			type,
			tagName: type.replace('.', '-'),
			body,
			attributes,
		},
	})
}
