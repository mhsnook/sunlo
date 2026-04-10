import { createContext, useContext } from 'react'
import { createStore } from 'zustand'
import { useStore } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import type { ReviewStages } from './review-utils'
import type { ManifestEntry } from './manifest'

const DEFAULT_PROPS = {
	lang: '',
	dayString: '',
	countCards: -1,
	stage: null as ReviewStages,
	currentCardIndex: -1,
	newCardEntries: null as Array<ManifestEntry> | null,
}

type ReviewActions = {
	skipReviewUnreviewed: () => void
	skipReviewAgains: () => void
	gotoReviewUnreviewed: (i: number) => void
	gotoReviewAgains: (i: number) => void
	gotoIndex: (i: number) => void
	gotoNext: () => void
	gotoEnd: () => void
	gotoPrevious: () => void
	init: (
		lang: string,
		dayString: string,
		countCards: number,
		newCardEntries?: Array<ManifestEntry> | null,
		stage?: ReviewStages,
		index?: number
	) => void
}

export type ReviewState = typeof DEFAULT_PROPS & {
	actions: ReviewActions
}

export type ReviewStore = ReturnType<typeof createReviewStore>

export function createReviewStore(lang: string, dayString: string) {
	return createStore<ReviewState>()(
		devtools(
			persist(
				(set) => ({
					...DEFAULT_PROPS,
					lang,
					dayString,
					actions: {
						skipReviewUnreviewed: () => set({ stage: 3 }),
						skipReviewAgains: () => set({ stage: 5 }),

						gotoReviewUnreviewed: (i: number) =>
							set({
								stage: 2,
								currentCardIndex: i,
							}),
						gotoReviewAgains: (i: number) =>
							set({
								stage: 4,
								currentCardIndex: i,
							}),
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
							newCardEntries: Array<ManifestEntry> | null = null,
							stage: ReviewStages = 1,
							index: number = 0
						) =>
							set((state) => {
								// if the lang doesn't match, we have an error
								if (lang !== state.lang || dayString !== state.dayString)
									throw new Error(
										'Mismatching language or dayString between params and current store state'
									)
								// ensure we only init once
								if (state.stage !== null) return state
								return {
									lang,
									dayString,
									countCards,
									newCardEntries,
									stage,
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
						stage: state.stage,
						currentCardIndex: state.currentCardIndex,
						newCardEntries: state.newCardEntries,
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

export const useReviewStage = (): ReviewStages => {
	return useReviewStore((state) => state.stage)
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

export const useNewCardEntries = (): Array<ManifestEntry> | null => {
	return useReviewStore((state) => state.newCardEntries)
}
