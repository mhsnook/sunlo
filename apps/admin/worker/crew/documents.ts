import { documentMax, SITREP, type RoomKey } from '../../shared/crew'

// The documents every room starts with, at revision 0. Their principals
// write the first revisions; agents can start more.
export const startingDocuments: Array<{ room: RoomKey; name: string }> = [
	{ room: 'command', name: SITREP },
	{ room: 'command', name: 'Business plan and status' },
	{ room: 'product', name: 'Roadmap' },
]

export type SaveCheck =
	| { ok: true; revision: number }
	| { ok: false; status: 400 | 404 | 409; error: string }

export type SavedDocument =
	| { ok: true; id: number; revision: number }
	| Extract<SaveCheck, { ok: false }>

// A save names the revision it started from, and lands only if that is still
// the current one, so no save overwrites a change its writer has not seen.
// `current` is null when the room has no document with that name: then only
// a save from revision 0 lands, and it starts the document.
export function checkSave(input: {
	name: string
	current: number | null
	base: number
	text: string
}): SaveCheck {
	const { name, current, base, text } = input
	if (current === null && base !== 0) {
		return {
			ok: false,
			status: 404,
			error: `This room has no document named "${name}". To start one, save it from revision 0.`,
		}
	}
	if (current !== null && base !== current) {
		return {
			ok: false,
			status: 409,
			error: `Nothing was saved: "${name}" is at revision ${current}, and this save started from revision ${base}. Read the current text, put your change into it, and save again from revision ${current}.`,
		}
	}
	const max = documentMax(name)
	if (text.length > max) {
		return {
			ok: false,
			status: 400,
			error: `Nothing was saved: "${name}" holds at most ${max} characters, and this text has ${text.length}.`,
		}
	}
	return { ok: true, revision: (current ?? 0) + 1 }
}

export const restoreSummary = (revision: number) =>
	`Restored revision ${revision}`
