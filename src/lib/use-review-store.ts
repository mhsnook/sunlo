import { useReviewStore } from '@/components/review/review-context-provider'
import type { DailyCacheKey, ReviewRow, ReviewStages, uuid } from '@/types/main'
import { pids } from '@/types/main'
import { useMemo } from 'react'
import { createStore, useStore } from 'zustand'

type ReviewsInProgressMap = Record<uuid, ReviewRow | null>

const DEFAULT_PROPS = {
	dayString: '',
	lang: '',
	stage: 0 as ReviewStages,
	currentCardIndex: -1,
	manifest: [] as pids,
	manifestLength: 0,
	reviewsMap: {} as ReviewsInProgressMap,
}

type ReviewProps = typeof DEFAULT_PROPS

type ReviewActions = {
	skipReviewUnreviewed: () => void
	skipReviewAgains: () => void
	gotoReviewUnreviewed: () => void
	gotoReviewAgains: () => void
	gotoNextValid: () => void
	gotoNext: () => void
	gotoPrevious: () => void
	init: (manifest: pids, lang: string, dayString: string) => void
	addReview: (review: ReviewRow) => void
}

export type ReviewState = ReviewProps & {
	actions: ReviewActions
}

export type ReviewStore = ReturnType<typeof createReviewStore>

export function createReviewStore(lang: string, dayString: string) {
	return createStore<ReviewState>()((set) => ({
		...DEFAULT_PROPS,
		lang,
		dayString,
		actions: {
			skipReviewUnreviewed: () => set({ stage: 3 }),
			skipReviewAgains: () => set({ stage: 5 }),

			gotoReviewUnreviewed: () =>
				set((state) => ({
					stage: 2,
					currentCardIndex: getIndexOfNextUnreviewedCard(state),
				})),
			gotoReviewAgains: () =>
				set((state) => ({
					stage: 4,
					currentCardIndex: getIndexOfNextAgainCard(state),
				})),

			gotoNextValid: () =>
				set((state) => ({
					currentCardIndex:
						state.stage < 3 ?
							getIndexOfNextUnreviewedCard(state)
						:	getIndexOfNextAgainCard(state),
				})),
			gotoNext: () =>
				set((state) => ({ currentCardIndex: state.currentCardIndex + 1 })),
			gotoPrevious: () =>
				set((state) => ({ currentCardIndex: state.currentCardIndex - 1 })),

					if (state.manifest.length) return state

			addReview: (review: ReviewRow) =>
				set((state) => ({
					reviewsMap: {
						...state.reviewsMap,
						[review.phrase_id]: review,
					},
				})),
		},
	}))
}

function getIndexOfNextUnreviewedCard(state: ReviewState) {
	const index = state.manifest.findIndex((pid, i) => {
		// if we're currently at card 3 of 40, don't even check cards 0-3
		// but if we're at 40/40 we should check from the start
		if (i !== state.manifestLength && i <= state.currentCardIndex) return false
		// if the entry is undefined, it means we haven't reviewed this card yet
		return !state.reviewsMap[pid]
	})

	return index !== -1 ? index : state.manifestLength
}

function getIndexOfNextAgainCard(state: ReviewState) {
	const index = state.manifest.findIndex((_, i) => {
		// we want first to check state.currentCardIndex + 1
		const indexChecking =
			state.currentCardIndex === state.manifestLength ?
				i
			:	(i + state.currentCardIndex + 1) % state.manifestLength
		return state.reviewsMap[state.manifest[indexChecking]]?.score === 1
	})
	return index !== -1 ? index : state.manifestLength
}

export const useReviewLang = (): string => {
	return useReviewStore((store) => store.lang)
}

export const useReviewDayString = (): string => {
	return useReviewStore((store) => store.dayString)
}

export const useReviewCacheKey = (): DailyCacheKey => {
	const lang = useReviewLang()
	const dayString = useReviewDayString()
	return useMemo(() => ['user', lang, 'review', dayString], [lang, dayString])
}

export const useReviewStage = (): ReviewStages => {
	return useReviewStore((state) => state.stage)
}

export const useCardIndex = (): number => {
	return useReviewStore((state) => state.currentCardIndex)
}

export const useReviewByIndex = (index: number): ReviewRow | null => {
	return useReviewStore((state) => state.reviewsMap[state.manifest[index]])
}

export const usePidByIndex = (index: number): uuid => {
	return useReviewStore((state) => state.manifest[index])
}

export const useManifest = (): pids => {
	return useReviewStore((state) => state.manifest)
}

export const useManifestLength = (): number => {
	return useReviewStore((state) => state.manifestLength)
}

export const useInitialiseReviewStore = (): ReviewActions['init'] => {
	return useReviewStore((state) => state.actions.init)
}

export const useReviewActions = (): ReviewActions => {
	return useReviewStore((state) => state.actions)
}
