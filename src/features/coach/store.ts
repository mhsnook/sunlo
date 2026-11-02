import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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

// Hands the pending notes to a message and starts following the coach again.
export function takeNotes(key: string) {
	const notes = (useCoachPageStore.getState()[key] ?? emptyPage).notes
	update(key, () => ({ notes: [], activeViewId: null }))
	return notes.map((note) => note.text)
}

const newThread = () => crypto.randomUUID().replaceAll('-', '').slice(0, 12)

// The current thread for each learner and language, on this device. A
// device without one starts a new conversation.
const useThreadStore = create<{ threads: Record<string, string> }>()(
	persist(() => ({ threads: {} }), { name: 'sunlo-coach-threads', version: 1 })
)

const threadSlot = (uid: string, lang: string) => `${uid}:${lang}`

// The /coach/$lang loader calls this, so the page always has a thread.
export function ensureCoachThread(uid: string, lang: string) {
	const slot = threadSlot(uid, lang)
	if (useThreadStore.getState().threads[slot]) return
	useThreadStore.setState((state) => ({
		threads: { ...state.threads, [slot]: newThread() },
	}))
}

export function useCoachThread(uid: string, lang: string) {
	const thread = useThreadStore((state) => state.threads[threadSlot(uid, lang)])
	if (!thread) throw new Error('The /coach/$lang loader did not start a thread')
	return thread
}

export const startOver = (uid: string, lang: string) =>
	useThreadStore.setState((state) => ({
		threads: { ...state.threads, [threadSlot(uid, lang)]: newThread() },
	}))
