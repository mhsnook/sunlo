import {
	documentSlug,
	SITREP,
	type DocumentSummaryType,
	type RoomKey,
} from '../../shared/crew'

// Where the app shows a room's documents, and where a link to one goes. The
// details panel beside every room lists them, and the document it shows is
// the `doc` slug in the URL (`_admin`), so a `doc:` link in a message opens
// one.

// The Common Room, which is not a room in `roomKeys`.
export const CREW = 'crew'
export type DetailsRoom = RoomKey | typeof CREW

// Which documents one room's details panel lists: its own, with the
// Situation Report pinned first since every agent reads it. The Common Room
// lists the Situation Report alone.
export function roomDocuments(
	room: DetailsRoom,
	documents: Array<DocumentSummaryType>
): Array<DocumentSummaryType> {
	const sitrep = documents.find((doc) => doc.name === SITREP)
	if (room === CREW) return sitrep ? [sitrep] : []
	const own = documents.filter((doc) => doc.room === room)
	if (room === 'command') {
		return own.toSorted((a, b) =>
			a.name === SITREP ? -1 : b.name === SITREP ? 1 : 0
		)
	}
	return sitrep ? [sitrep, ...own] : own
}

const showsDocument = (room: DetailsRoom, document: DocumentSummaryType) =>
	document.name === SITREP || document.room === room

// Where a link to a document goes: the room the admin is reading, when its
// details list that document, and otherwise the room that keeps it.
export function documentLinkOptions(
	from: DetailsRoom,
	document: DocumentSummaryType
) {
	const room = showsDocument(from, document) ? from : document.room
	const search = { doc: documentSlug(document.name) }
	return room === CREW
		? ({ to: '/', search } as const)
		: ({ to: '/room/$room', params: { room }, search } as const)
}
