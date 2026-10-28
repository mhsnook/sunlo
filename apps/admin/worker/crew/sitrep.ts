import {
	crewList,
	displayName,
	type CrewKey,
	type SitrepLineType,
} from '../../shared/crew'

// The Situation Report as every agent reads it in its <crew-context>: Riker's
// note, then each vertical's tracks in roster order, with an empty line
// marked rather than left out, so a stalled track shows.
export function sitrepContext(
	lines: Array<SitrepLineType>,
	stamp: (iso: string) => string
) {
	const line = (agent: CrewKey, track: string) => {
		const entry = lines.find((l) => l.agent === agent && l.track === track)
		return entry
			? `${entry.text} (${entry.byName}, ${stamp(entry.at)})`
			: '(no report yet)'
	}
	const verticals = crewList
		.filter((member) => member.key !== 'riker' && member.tracks.length)
		.flatMap((member) =>
			member.tracks.map(
				(track) =>
					`- ${displayName(member.key)}, ${track}: ${line(member.key, track)}`
			)
		)
	return [
		'## The Situation Report: where each vertical stands now',
		`Riker's note: ${line('riker', 'Note')}`,
		verticals.join('\n'),
	].join('\n\n')
}
