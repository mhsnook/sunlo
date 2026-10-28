import {
	crew,
	principalOf,
	resolveHandle,
	type CrewKey,
	type RoutingType,
} from '../../shared/crew'

// Who CLEF names when more than one agent could answer, or it cannot tell:
// the Command room's principal, who passes it on.
const fallback = principalOf('command')

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
- "route": the message asks a question, gives an instruction, or needs an answer now. Name the one agent who should answer. If more than one could, or you cannot tell who, name "${fallback}": ${crew[fallback].title.toLowerCase()} to the founder, who passes it on.
- "room": the message is a note, a thought, an update, or context. Nobody answers now; agents read it at their next run.

When unsure whether the message needs an answer now, choose "room".

The agents:
${roster}

Reply with JSON only, like {"kind":"route","agents":["${active.find((key) => key !== fallback) ?? fallback}"]} or {"kind":"room","agents":[]}. Never name more than one agent.`
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
// models. Anything that is not a "route" becomes "room", which wakes nobody.
// A route wakes one agent: when the model names several, or none it may
// wake, the message goes to the fallback, who passes it on. A room's name
// counts as its principal.
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
		? agents.flatMap((agent) => {
				const key = typeof agent === 'string' ? resolveHandle(agent) : null
				return key && active.includes(key) ? [key] : []
			})
		: []
	const chosen =
		named.length === 1
			? named[0]
			: active.includes(fallback)
				? fallback
				: active.length === 1
					? active[0]
					: null
	return chosen ? { kind: 'route', agents: [chosen], by: 'model' } : room
}
