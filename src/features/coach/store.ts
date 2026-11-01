import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CoachMessage } from './protocol'

export type CoachLogEntry = {
	id: string
	kind: 'learner' | 'coach' | 'action' | 'error'
	text: string
}

export type CoachView = {
	id: string
	title: string
	subtitle: string | null
	phraseIds: Array<string>
	requestIds: Array<string>
	playlistIds: Array<string>
}

export type CoachThread = {
	// What the model sees. `log` is what the learner sees; the two diverge
	// because tool calls and page notes never render as chat bubbles.
	transcript: Array<CoachMessage>
	log: Array<CoachLogEntry>
	suggestions: Array<string>
	views: Array<CoachView>
	activeViewId: string | null
	// Things the learner did on the page since their last message. They ride
	// along with the next message instead of waking the coach on every tap.
	pageNotes: Array<string>
}

export const emptyThread: CoachThread = {
	transcript: [],
	log: [],
	suggestions: [],
	views: [],
	activeViewId: null,
	pageNotes: [],
}

type CoachState = {
	threads: Record<string, CoachThread>
	busy: Record<string, boolean>
	update: (
		key: string,
		fn: (thread: CoachThread) => Partial<CoachThread>
	) => void
	setBusy: (key: string, busy: boolean) => void
	reset: (key: string) => void
}

export const useCoachStore = create<CoachState>()(
	persist(
		(set) => ({
			threads: {},
			busy: {},
			update: (key, fn) =>
				set((state) => {
					const thread = state.threads[key] ?? emptyThread
					return {
						threads: { ...state.threads, [key]: { ...thread, ...fn(thread) } },
					}
				}),
			setBusy: (key, busy) =>
				set((state) => ({ busy: { ...state.busy, [key]: busy } })),
			reset: (key) =>
				set((state) => {
					const { [key]: _gone, ...threads } = state.threads
					return { threads }
				}),
		}),
		{
			name: 'sunlo-coach',
			version: 1,
			partialize: (state) => ({ threads: state.threads }),
		}
	)
)

export const threadKey = (uid: string, lang: string) => `${uid}:${lang}`

export const getThread = (key: string) =>
	useCoachStore.getState().threads[key] ?? emptyThread

export const updateThread = (
	key: string,
	fn: (thread: CoachThread) => Partial<CoachThread>
) => useCoachStore.getState().update(key, fn)

export const logId = () => crypto.randomUUID()
