import type { ActionType, CharterEntryType } from '../../shared/crew'

// The buttons on a proposed charter entry's card.
export const CHARTER_ACTIONS: Array<ActionType> = [
	{ id: 'keep', label: 'Keep it' },
	{ id: 'not-quite', label: 'Not quite' },
]

type Decided = Pick<CharterEntryType, 'status' | 'keptAt'>

// The admin's answer on a proposed entry's card. Only "Keep it" keeps it:
// "Not quite" and a dismissal both drop it.
export const answeredEntry = (actionId: string, at: string): Decided =>
	actionId === 'keep'
		? { status: 'kept', keptAt: at }
		: { status: 'dropped', keptAt: null }

// The admin editing an entry directly in the room log. Keeping it stamps
// the time; a new text or a drop leaves the stamp as it was.
export function editedEntry(
	entry: Pick<CharterEntryType, 'text' | 'status' | 'keptAt'>,
	change: { text?: string; status?: 'kept' | 'dropped' },
	at: string
): Pick<CharterEntryType, 'text' | 'status' | 'keptAt'> {
	return {
		text: change.text ?? entry.text,
		status: change.status ?? entry.status,
		keptAt: change.status === 'kept' ? at : entry.keptAt,
	}
}
