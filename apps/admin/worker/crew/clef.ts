import {
	crew,
	isCrewKey,
	type CrewKey,
	type RoutingType,
} from '../../shared/crew'

export type ClefExample = {
	text: string
	routing: Pick<RoutingType, 'kind' | 'agents'>
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export function clefPrompt(
	text: string,
	active: Array<CrewKey>,
	examples: Array<ClefExample>
): Array<ChatMessage> {
	const roster = active
		.map(
			(key) =>
				`- "${key}" (${crew[key].title}) looks after: ${crew[key].looksAfter.join('; ')}`
		)
		.join('\n')
	const system = `You route messages in a team chat between the founder of Sunlo, a language-learning app, and AI agents.

For each message, decide one thing:
- "route": the message asks a question, gives an instruction, or needs an answer now. Name the agents who should answer.
- "room": the message is a note, a thought, an update, or context. Nobody answers now; agents read it at their next run.

When unsure, choose "room".

The agents:
${roster}

Reply with JSON only, like {"kind":"route","agents":["product"]} or {"kind":"room","agents":[]}.`
	const shots = examples.flatMap(
		(example): Array<ChatMessage> => [
			{ role: 'user', content: example.text },
			{
				role: 'assistant',
				content: JSON.stringify({
					kind: example.routing.kind,
					agents: example.routing.agents,
				}),
			},
		]
	)
	return [
		{ role: 'system', content: system },
		...shots,
		{ role: 'user', content: text },
	]
}

// Workers AI returns the reply as a string, or as parsed JSON for some
// models. Anything that is not a clear "route" to an active agent becomes
// "room", which wakes nobody.
export function parseClefReply(
	reply: unknown,
	active: Array<CrewKey>
): RoutingType {
	const room: RoutingType = { kind: 'room', agents: [], by: 'model' }
	let value = reply
	if (typeof reply === 'string') {
		const json = reply.match(/\{[\s\S]*\}/)?.[0]
		if (!json) return room
		try {
			value = JSON.parse(json)
		} catch {
			return room
		}
	}
	if (!value || typeof value !== 'object') return room
	const { kind, agents } = value as { kind?: unknown; agents?: unknown }
	if (kind !== 'route') return room
	const named = Array.isArray(agents)
		? agents.filter(
				(agent): agent is CrewKey =>
					typeof agent === 'string' &&
					isCrewKey(agent) &&
					active.includes(agent)
			)
		: []
	// With one active agent, "route" can only mean that agent.
	const chosen = named.length ? named : active.length === 1 ? active : []
	return chosen.length ? { kind: 'route', agents: chosen, by: 'model' } : room
}
