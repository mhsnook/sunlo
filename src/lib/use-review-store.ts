import { useReviewStore } from '@/components/review/review-context-provider'
import type { ReviewRow, ReviewStages, uuid } from '@/types/main'
import { pids } from '@/types/main'
import { create } from 'zustand'

type ReviewsInProgressMap = Record<uuid, ReviewRow | null>

const initialState = {
	dayString: '',
	lang: '',
	stage: 0 as ReviewStages,
	currentCardIndex: -1,
	manifest: [] as pids,
	manifestLength: 0,
	reviewsMap: {} as ReviewsInProgressMap,
}

type ReviewStoreState = typeof initialState

type ReviewStoreActions = {
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

type StoreType = ReviewStoreState & {
	actions: ReviewStoreActions
}

export function createReviewStore() {
	return create<StoreType>((set) => ({
		...initialState,
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

			init: (manifest: pids, lang: string, dayString: string) =>
				set((state) => {
					// if the lang doesn't match, we have an error
					if (lang !== state.lang)
						throw new Error(
							'Mismatching language codes between route param and context provider (active state)'
						)
					// ensure we only init once
					if (dayString === state.dayString) return state
					return {
						// now we'll just assume these can be wiped out
						lang,
						dayString,
						manifest,
						manifestLength: manifest.length,
						currentCardIndex: 0,
						stage: 1,
						reviewsMap: manifest.reduce<ReviewsInProgressMap>(
							(acc: ReviewsInProgressMap, pid) => {
								acc[pid] = null
								return acc
							},
							{}
						),
					}
				}),

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

function getIndexOfNextUnreviewedCard(state: ReviewStoreState) {
	const index = state.manifest.findIndex((pid, i) => {
		// if we're currently at card 3 of 40, don't even check cards 0-3
		// but if we're at 40/40 we should check from the start
		if (i !== state.manifestLength && i <= state.currentCardIndex) return false
		// if the entry is undefined, it means we haven't reviewed this card yet
		return !state.reviewsMap[pid]
	})

	return index !== -1 ? index : state.manifestLength
}

function getIndexOfNextAgainCard(state: ReviewStoreState) {
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

export const useReviewStage = () => {
	const store = useReviewStore()
	return store((state) => state.stage)
}

export const useCardIndex = () => {
	const store = useReviewStore()
	return store((state) => state.currentCardIndex)
}
export const useReviewByIndex = (index: number) => {
	const store = useReviewStore()
	return store((state) => state.reviewsMap[state.manifest[index]])
}
export const usePidByIndex = (index: number) => {
	const store = useReviewStore()
	return store((state) => state.manifest[index])
}

export const useManifestLength = () => {
	const store = useReviewStore()
	return store((state) => state.manifestLength)
}

export const useInitialiseReviewStore = (lang: string, todayString: string) => {
	const store = useReviewStore()
	return store(
		(state) => (manifest: pids) =>
			state.actions.init(manifest, lang, todayString)
	)
}

export const useReviewActions = () => {
	const store = useReviewStore()
	return store((state) => state.actions)
}
