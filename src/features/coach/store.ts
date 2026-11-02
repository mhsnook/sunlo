import { create } from 'zustand'
import type { CoachView } from './conversation'

// The page's own state. The conversation lives in the coach agent; this is
// only what the learner did on this page that the agent has not seen yet.
type PageState = {
	// Sets the learner opened from a request or playlist tile.
	localViews: Array<CoachView>
	// null follows the newest set the coach showed.
	activeViewId: string | null
	// Sent with the learner's next message, then cleared.
	notes: Array<{ id: string; text: string }>
}

const emptyPage: PageState = { localViews: [], activeViewId: null, notes: [] }

export const useCoachPageStore = create<Record<string, PageState>>()(() => ({}))

export const usePageState = (key: string) =>
	useCoachPageStore((state) => state[key] ?? emptyPage)

function update(key: string, fn: (page: PageState) => Partial<PageState>) {
	useCoachPageStore.setState((state) => {
		const page = state[key] ?? emptyPage
		return { [key]: { ...page, ...fn(page) } }
	})
}

export const showView = (key: string, id: string | null) =>
	update(key, () => ({ activeViewId: id }))

export const openLocalView = (key: string, view: CoachView, note: string) =>
	update(key, (page) => ({
		localViews: [...page.localViews, view],
		activeViewId: view.id,
		notes: [...page.notes, { id: crypto.randomUUID(), text: note }],
	}))

export const addNote = (key: string, note: string) =>
	update(key, (page) => ({
		notes: [...page.notes, { id: crypto.randomUUID(), text: note }],
	}))

export const pendingNotes = (key: string) =>
	(useCoachPageStore.getState()[key] ?? emptyPage).notes

// After the message carrying these notes was admitted. A note the learner
// made while it was sending stays for the next message.
export const clearNotes = (key: string, ids: Array<string>) =>
	update(key, (page) => ({
		notes: page.notes.filter((note) => !ids.includes(note.id)),
		activeViewId: null,
	}))
