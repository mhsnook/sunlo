import { crew, displayName, roomNames, type CrewKey } from '../../shared/crew'

type View = { agent: CrewKey; body: string }

const excerpt = (body: string) => {
	const line = body.replace(/\s+/g, ' ').trim()
	return line.length > 200 ? `${line.slice(0, 199)}…` : line
}

// What each of the two agents hears when the admin goes with one view. The
// principal also hears that the pick may be worth a charter entry, since a
// pick is how the room learns how the admin decides.
export function pickReports(input: {
	original: View
	other: View
	chosen: 'original' | 'other'
	by: string
}): Array<{ agent: CrewKey; body: string }> {
	const { original, other, chosen, by } = input
	const [kept, passed] =
		chosen === 'original' ? [original, other] : [other, original]
	const room = roomNames[crew[original.agent].room]
	const said = `${by} went with ${displayName(kept.agent)}'s view: "${excerpt(kept.body)}" over ${displayName(passed.agent)}'s: "${excerpt(passed.body)}".`
	return [
		{
			agent: original.agent,
			body: `${said} If the pick shows how they decide, propose it for the ${room}'s charter with propose_charter.`,
		},
		{ agent: other.agent, body: said },
	]
}
