import {
	roomKeys,
	roomNames,
	type RoomKey,
	type SitrepLineType,
} from '../../shared/crew'

// The Situation Report as every agent reads it in its <crew-context>: the
// Command room's line, which is Riker's note on the whole, then each other
// room in order, with an empty line marked rather than left out, so a stalled
// room shows.
export function sitrepContext(
	lines: Array<SitrepLineType>,
	stamp: (iso: string) => string
) {
	const line = (room: RoomKey) => {
		const entry = lines.find((l) => l.room === room)
		return entry
			? `${entry.text} (${entry.byName}, ${stamp(entry.at)})`
			: '(no report yet)'
	}
	const rooms = roomKeys
		.filter((room) => room !== 'command')
		.map((room) => `- ${roomNames[room]}: ${line(room)}`)
	return [
		'## The Situation Report: where each room stands now',
		`Riker's note, for the Command room: ${line('command')}`,
		rooms.join('\n'),
	].join('\n\n')
}
