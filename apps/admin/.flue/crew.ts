import { dispatch, observe, type Agent } from '@flue/runtime'
import { getAgentByName } from 'agents'
import { env } from 'cloudflare:workers'
import { crewKeys, roomOfPlace, type CrewKey } from '../shared/crew'
import {
	CONVERSATION,
	ROOM,
	type CrewRoom,
	type Wake,
} from '../worker/crew/room'
import { Data } from './agents/data'
import { Geordi } from './agents/geordi'
import { Riker } from './agents/riker'

export const roomFor = () =>
	getAgentByName(env.CREW_ROOM as DurableObjectNamespace<CrewRoom>, ROOM)

// The crew members that run. A function, not a constant: agent modules
// import this file, and the agent they export is not initialised yet while
// this module evaluates.
export const crewAgents = (): Partial<Record<CrewKey, Agent>> => ({
	riker: Riker,
	data: Data,
	geordi: Geordi,
})

// A run that fails or is aborted settles without useAgentFinish, so the room
// hears about it here instead.
observe((event) => {
	if (
		event.type === 'submission_settled' &&
		event.outcome !== 'completed' &&
		event.instanceId === CONVERSATION
	) {
		// Flue names an agent by its identity ("Riker"), not its crew key.
		const key = crewKeys.find((candidate) => {
			const agent = crewAgents()[candidate]
			return agent && (agent.agentName ?? agent.name) === event.agentName
		})
		if (key) void roomFor().then((room) => room.failRun(key))
	}
})

// Delivers messages to the agents CLEF or an @mention woke. The message is
// already in its timeline, so a dispatch that fails is logged, not thrown.
// A <common-room-message> came from the Common Room, and a <room-message>
// from the agent's own room.
export async function wake(wakes: Array<Wake>, from: string) {
	await Promise.all(
		wakes.map(({ agent, body, messageId, place }) =>
			deliver(
				agent,
				roomOfPlace(place) ? 'room.message' : 'common-room.message',
				body,
				{ from, messageId }
			).catch((error: unknown) =>
				console.error(`Could not wake ${agent}`, error)
			)
		)
	)
}

// Asks Data for the pre-meeting report, when a meeting starts without one.
export const requestReport = () =>
	deliver(
		'data',
		'meeting.report',
		'The weekly meeting just started, and there is no pre-meeting report for it yet. Write one now with file_report.'
	)

// One signal to an agent's running memory. `type` "common-room.message"
// arrives as a <common-room-message> tag.
export async function deliver(
	agent: CrewKey,
	type: string,
	body: string,
	attributes?: Record<string, string>
) {
	const target = crewAgents()[agent]
	if (!target) return
	await dispatch(target, {
		id: CONVERSATION,
		message: {
			kind: 'signal',
			type,
			tagName: type.replace('.', '-'),
			body,
			attributes,
		},
	})
}
