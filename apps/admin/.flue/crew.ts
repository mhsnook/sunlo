import { dispatch, observe, type Agent } from '@flue/runtime'
import { getAgentByName } from 'agents'
import { env } from 'cloudflare:workers'
import { crewKeys, type CrewKey } from '../shared/crew'
import {
	BRIDGE,
	conversationOf,
	ROOM,
	TEAM,
	type CrewRoom,
	type Wake,
} from '../worker/crew/room'
import { Data } from './agents/data'
import { Product } from './agents/product'
import { Riker } from './agents/riker'

export const roomFor = () =>
	getAgentByName(env.CREW_ROOM as DurableObjectNamespace<CrewRoom>, ROOM)

// The crew members that run. A function, not a constant: agent modules
// import this file, and the agent they export is not initialised yet while
// this module evaluates.
export const crewAgents = (): Partial<Record<CrewKey, Agent>> => ({
	riker: Riker,
	data: Data,
	product: Product,
})

// A run that fails or is aborted settles without useAgentFinish, so the room
// hears about it here instead.
observe((event) => {
	if (
		event.type === 'submission_settled' &&
		event.outcome !== 'completed' &&
		(event.instanceId === TEAM || event.instanceId === BRIDGE)
	) {
		// Flue names an agent by its identity ("Riker"), not its crew key.
		const key = crewKeys.find((candidate) => {
			const agent = crewAgents()[candidate]
			return agent && (agent.agentName ?? agent.name) === event.agentName
		})
		if (key) void roomFor().then((room) => room.failRun(key))
	}
})

// Delivers messages to the agents CLEF or an @mention woke, each in its own
// conversation (`conversationOf`). The message is already in its timeline,
// so a dispatch that fails is logged, not thrown.
export async function wake(wakes: Array<Wake>, from: string) {
	await Promise.all(
		wakes.map(({ agent, body, messageId, place }) =>
			deliver(
				agent,
				conversationOf(agent),
				place === 'bridge' ? 'enterprise.message' : 'crew.message',
				body,
				{ from, messageId }
			).catch((error: unknown) =>
				console.error(`Could not wake ${agent}`, error)
			)
		)
	)
}

// One signal to one conversation of an agent. `type` "crew.message" arrives
// as a <crew-message> tag.
export async function deliver(
	agent: CrewKey,
	conversation: string,
	type: string,
	body: string,
	attributes?: Record<string, string>
) {
	const target = crewAgents()[agent]
	if (!target) return
	await dispatch(target, {
		id: conversation,
		message: {
			kind: 'signal',
			type,
			tagName: type.replace('.', '-'),
			body,
			attributes,
		},
	})
}
