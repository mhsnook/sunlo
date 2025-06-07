import type { ReviewRow, ReviewStages, uuid } from '@/types/main'
import { pids } from '@/types/main'
import { create } from 'zustand'

type ReviewsInProgressMap = Record<uuid, ReviewRow | null>

type ReviewStoreState = {
	stage: ReviewStages
	currentCardIndex: number
	manifest: pids
	manifestLength: number
	reviewsMap: ReviewsInProgressMap
}

type ReviewStoreActions = {
	skipReviewUnreviewed: () => void
	skipReviewAgains: () => void
	gotoReviewUnreviewed: () => void
	gotoReviewAgains: () => void
	gotoNextValid: () => void
	gotoNext: () => void
	gotoPrevious: () => void
	init: (manifest: pids) => void
	addReview: (review: ReviewRow) => void
}

const useReviewStore = create<
	ReviewStoreState & { actions: ReviewStoreActions }
>((set) => ({
	stage: 0,
	currentCardIndex: -1,
	manifest: [],
	manifestLength: 0,
	reviewsMap: {},
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

		init: (manifest: pids) =>
			set((state) => {
				return {
					// all of these should be no-op if the data is already set
					manifest: state.manifest.length === 0 ? manifest : state.manifest,
					manifestLength:
						state.manifestLength === 0 ? manifest.length : state.manifestLength,
					currentCardIndex:
						state.currentCardIndex === -1 ? 0 : state.currentCardIndex,
					stage: state.stage === 0 ? 1 : state.stage,
					reviewsMap:
						state.reviewsMap ?
							state.reviewsMap
						:	manifest.reduce<ReviewsInProgressMap>(
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

export const useReviewStage = () => useReviewStore((state) => state.stage)

export const useCardIndex = () =>
	useReviewStore((state) => state.currentCardIndex)

export const useReviewByIndex = (index: number) =>
	useReviewStore((state) => state.reviewsMap[state.manifest[index]])

export const usePidByIndex = (index: number) =>
	useReviewStore((state) => state.manifest[index])

export const useManifestLength = () =>
	useReviewStore((state) => state.manifestLength)

export const useInitialiseReviewStore = () =>
	useReviewStore((state) => state.actions.init)

export const useReviewActions = () => useReviewStore((state) => state.actions)

export const getManifest = () => useReviewStore.getState().manifest
