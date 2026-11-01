import { openingLines } from '../../shared/blocks'
import { adoptedLine } from './flows'
import {
	crew,
	displayName,
	principalOf,
	roomNames,
	stepLabel,
	type CrewKey,
	type PaintingType,
	type PickChoice,
	type SketchType,
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

// The labels of a card's options, in order: A, B, C.
export const optionLabel = (index: number) => String.fromCharCode(65 + index)

// The agent hears `said` and then `next`. The room's principal hears it too,
// as it hears a pick between two views, with who made it.
function cardPickReports(input: {
	agent: CrewKey
	said: string
	next: string
	made: string
}): Array<{ agent: CrewKey; body: string }> {
	const { agent, said, next, made } = input
	const room = crew[agent].room
	const principal = principalOf(room)
	return [
		{ agent, body: `${said}. ${next}` },
		...(principal === agent
			? []
			: [
					{
						agent: principal,
						body: `${said}. ${displayName(agent)} ${made}. If the pick shows how they decide, propose it for the ${roomNames[room]}'s charter with propose_charter.`,
					},
				]),
	]
}

// The admin went with one of an agent's sketches. On a card of new versions
// for a flow's step, the pick becomes that step's picture.
export function sketchPickReports(input: {
	agent: CrewKey
	title: string
	sketch: SketchType
	by: string
	step?: { index: number; flowTitle: string }
}): Array<{ agent: CrewKey; body: string }> {
	const { agent, title, sketch, by, step } = input
	return cardPickReports({
		agent,
		said: step
			? `${by} went with version ${sketch.label} for step ${stepLabel(step.index)} of the flow "${step.flowTitle}": ${sketch.idea}`
			: `${by} went with sketch ${sketch.label} of "${title}": ${sketch.idea}`,
		next: step
			? adoptedLine(step.index, sketch.id)
			: `Its HTML is sketch ${sketch.id}.`,
		made: 'drew it',
	})
}

// The admin went with one of the painter's paintings. The agent hears where
// to look at it and is asked to keep what the pick says about the admin's
// taste.
export function paintingPickReports(input: {
	agent: CrewKey
	title: string
	painting: PaintingType
	by: string
}): Array<{ agent: CrewKey; body: string }> {
	const { agent, title, painting, by } = input
	const where = painting.svg
		? `It is SVG ${painting.svg.id}${painting.svg.png === null ? '' : `; look at its rendering, image ${painting.svg.png}`}.`
		: `It is image ${painting.image?.id}.`
	return cardPickReports({
		agent,
		said: `${by} went with painting ${painting.label} of "${title}", in the ${painting.style} style`,
		next: `${where} Look at it with look_at_image to see what they liked, keep that in your Design document or your memory, and carry it into your sketches within the brand.`,
		made: 'had it painted',
	})
}
