import { dispatch, observe, type Agent } from '@flue/runtime'
import { getAgentByName } from 'agents'
import { env } from 'cloudflare:workers'
import {
	displayName,
	isCrewKey,
	roomOfPlace,
	type CrewKey,
} from '../shared/crew'
import {
	CONVERSATION,
	ROOM,
	type CrewRoom,
	type Wake,
} from '../worker/crew/room'
import { stepChange } from '../worker/crew/steps'
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

// One stub per isolate: getAgentByName initialises the room on every call.
// A failed call drops it, in case the stub broke.
let recorder: ReturnType<typeof roomFor> | null = null

// A submission's events go to the room one at a time, in the order Flue
// emitted them, so its close always lands after its steps.
let recording = Promise.resolve()
const record = (
	send: (room: Awaited<ReturnType<typeof roomFor>>) => Promise<unknown>
) => {
	recording = recording
		.then(async () => send(await (recorder ??= roomFor())))
		.then(
			() => undefined,
			(error: unknown) => {
				recorder = null
				console.error('Could not record a run event', error)
			}
		)
}

observe((event) => {
	const thread = threadOf(event.instanceId)
	if (event.instanceId !== CONVERSATION && !thread) return
	// Each agent's Flue identity is its crew key.
	const agent = event.agentName
	if (!agent || !isCrewKey(agent)) return
	if (event.type === 'submission_running') {
		const key = { agent, thread, submission: event.submissionId }
		record((room) => room.startRun(key, event.timestamp))
		return
	}
	if (event.type === 'submission_settled') {
		const key = { agent, thread, submission: event.submissionId }
		record((room) => room.settleRun(key, event.outcome))
		return
	}
	const change = stepChange(agent, event)
	const submission = event.submissionId
	if (!change || !submission) return
	record((room) => room.recordStep({ agent, thread, submission }, change))
})

// Delivers messages to the agents CLEF or an @mention woke. The message is
// already in its timeline, so a dispatch that fails is logged, not thrown.
// A <common-room-message> came from the Common Room, and a <room-message>
// from the agent's own room.
export async function wake(wakes: Array<Wake>, from: string) {
	await Promise.all(
		wakes.map(({ agent, body, messageId, place, thread, alsoTo }) => {
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
				...(alsoTo ? { also: alsoTo.map(displayName).join(', ') } : {}),
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
	// The id of a side-thread's first message, for a message to the helper
	// (the note, or the asker's later replies): it goes into that thread's
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
