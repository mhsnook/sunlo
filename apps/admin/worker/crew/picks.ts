import { openingLines } from '../../shared/blocks'
import {
	crew,
	displayName,
	roomNames,
	type CrewKey,
	type PickChoice,
} from '../../shared/crew'

type View = { agent: CrewKey; body: string }

// What each of the two agents hears when the admin goes with one view. The
// principal also hears that the pick may be worth a charter entry, since a
// pick is how the room learns how the admin decides.
export function pickReports(input: {
	original: View
	other: View
	chosen: PickChoice
	by: string
}): Array<{ agent: CrewKey; body: string }> {
	const { original, other, chosen, by } = input
	const [kept, passed] =
		chosen === 'original' ? [original, other] : [other, original]
	const room = roomNames[crew[original.agent].room]
	const said = `${by} went with ${displayName(kept.agent)}'s view: "${openingLines(kept.body, 200)}" over ${displayName(passed.agent)}'s: "${openingLines(passed.body, 200)}".`
	return [
		{
			agent: original.agent,
			body: `${said} If the pick shows how they decide, propose it for the ${room}'s charter with propose_charter.`,
		},
		{ agent: other.agent, body: said },
	]
}
