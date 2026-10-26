import { dispatch, type Agent } from '@flue/runtime'
import { env } from 'cloudflare:workers'
import type { CrewKey } from '../shared/crew'
import { TEAM, type CrewRoom, type Wake } from '../worker/crew/room'
import { Product } from './agents/product'

export const roomFor = (bindings: Env = env) =>
	(bindings.CREW_ROOM as DurableObjectNamespace<CrewRoom>).getByName(TEAM)

// A function, not a constant: agent modules import this file, and the agent
// they export is not initialised yet while this module evaluates.
const agentFor = (key: CrewKey) => {
	const agents: Partial<Record<CrewKey, Agent>> = { product: Product }
	return agents[key]
}

// Delivers room messages to the agents CLEF or an @mention woke. Every run
// in the room shares one conversation per agent, "team".
export async function wake(wakes: Array<Wake>, from: string) {
	const sends = wakes.flatMap(({ agent, body, messageId }) => {
		const target = agentFor(agent)
		if (!target) return []
		return [
			dispatch(target, {
				id: TEAM,
				message: {
					kind: 'signal',
					type: 'crew.message',
					tagName: 'crew-message',
					body,
					attributes: { from, messageId },
				},
			}),
		]
	})
	await Promise.all(sends)
}

export async function deliver(
	agent: CrewKey,
	conversation: string,
	type: string,
	body: string
) {
	const target = agentFor(agent)
	if (!target) return
	await dispatch(target, {
		id: conversation,
		message: { kind: 'signal', type, tagName: type.replace('.', '-'), body },
	})
}
