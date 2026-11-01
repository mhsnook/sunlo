import {
	SITREP,
	type DocumentSummaryType,
	type RoomKey,
} from '../../shared/crew'
import { dayLabel } from './format'

// The Common Room, which is not a room in `roomKeys`.
export const CREW = 'crew'
export type DetailsRoom = RoomKey | typeof CREW

// A room's details panel lists the Situation Report, which every agent
// reads, and the room's own documents. The Common Room has no documents of
// its own, so it lists the Situation Report alone.
const showsDocument = (room: DetailsRoom, document: DocumentSummaryType) =>
	document.name === SITREP || document.room === room

// What one room's details panel lists, with the Situation Report first.
export const roomDocuments = (
	room: DetailsRoom,
	documents: Array<DocumentSummaryType>
): Array<DocumentSummaryType> =>
	documents
		.filter((doc) => showsDocument(room, doc))
		.toSorted((a, b) => Number(b.name === SITREP) - Number(a.name === SITREP))

// Where a link to a document goes: the room the admin is reading, when its
// details list that document, and otherwise the room that keeps it.
export function documentLinkOptions(
	from: DetailsRoom,
	document: DocumentSummaryType
) {
	const room = showsDocument(from, document) ? from : document.room
	const search = { doc: document.id }
	return room === CREW
		? ({ to: '/', search } as const)
		: ({ to: '/room/$room', params: { room }, search } as const)
}

export const documentStatus = (document: DocumentSummaryType) =>
	document.at
		? `Revision ${document.revision} · ${document.byName}, ${dayLabel(document.at)}`
		: 'Not written yet'
