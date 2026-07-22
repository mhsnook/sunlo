import { createContext, useContext } from 'react'
import { createStore } from 'zustand'
import { useStore } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

const DEFAULT_PROPS = {
	lang: '',
	dayString: '',
	countCards: -1,
	currentCardIndex: -1,
}

type ReviewActions = {
	gotoIndex: (i: number) => void
	gotoNext: () => void
	gotoEnd: () => void
	gotoPrevious: () => void
	init: (
		lang: string,
		dayString: string,
		countCards: number,
		index?: number
	) => void
}

export type ReviewState = typeof DEFAULT_PROPS & {
	actions: ReviewActions
}

export type ReviewStore = ReturnType<typeof createReviewStore>

/**
 * A throwaway per-session cursor, nothing more. Session *state* — which cards
 * exist (manifest), which have been reviewed (card_review), and what stage the
 * session is at (milestone log) — lives in the collections, synced across
 * devices and mirrored to localStorage. This store holds only the current
 * card index within the manifest — an in-tab navigation position. The go route
 * re-seeds it from `stats.index` on mount and on every stage change, so the
 * actual position is always derived from the shared (stage, reviews); the
 * persisted copy survives only as the "a session was started in this tab"
 * signal the routing guard reads (`countCards`/`currentCardIndex` !== -1).
 */
export function createReviewStore(lang: string, dayString: string) {
	return createStore<ReviewState>()(
		devtools(
			persist(
				(set) => ({
					...DEFAULT_PROPS,
					lang,
					dayString,
					actions: {
						gotoIndex: (i) => set({ currentCardIndex: i }),
						gotoNext: () =>
							set((state) => ({
								currentCardIndex: state.currentCardIndex + 1,
							})),
						gotoPrevious: () =>
							set((state) => ({
								currentCardIndex: state.currentCardIndex - 1,
							})),
						gotoEnd: () =>
							set((state) => ({
								currentCardIndex: state.countCards,
							})),

						init: (
							lang: string,
							dayString: string,
							countCards: number,
							index: number = 0
						) =>
							set((state) => {
								// if the lang doesn't match, we have an error
								if (lang !== state.lang || dayString !== state.dayString)
									throw new Error(
										'Mismatching language or dayString between params and current store state'
									)
								// ensure we only init once (countCards is -1 until initialised)
								if (state.countCards !== -1) return state
								return {
									lang,
									dayString,
									countCards,
									currentCardIndex: index,
								}
							}),
					},
				}),
				{
					name: `sunlo-review:${lang}-${dayString}`,
					partialize: (state) => ({
						lang: state.lang,
						dayString: state.dayString,
						countCards: state.countCards,
						currentCardIndex: state.currentCardIndex,
					}),
				}
			)
		)
	)
}

export const ReviewStoreContext = createContext<ReviewStore | null>(null)

export function useReviewStore<T>(selector: (state: ReviewState) => T): T {
	const store = useContext(ReviewStoreContext)
	if (!store) throw new Error('Missing ReviewStoreContext in the tree')
	return useStore(store, selector)
}

export const useReviewLang = (): string => {
	return useReviewStore((store) => store.lang)
}

export const useReviewDayString = (): string => {
	return useReviewStore((store) => store.dayString)
}

export const useCardIndex = (): number => {
	return useReviewStore((state) => state.currentCardIndex)
}

export const useInitialiseReviewStore = (): ReviewActions['init'] => {
	return useReviewStore((state) => state.actions.init)
}

export const useReviewActions = (): ReviewActions => {
	return useReviewStore((state) => state.actions)
}
