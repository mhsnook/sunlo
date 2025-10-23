import { createStore } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { useReviewStore } from '@/components/review/review-context-provider'
import type { ReviewStages, ReviewsMap, pids } from '@/types/main'
import { useReviewsToday } from './use-reviews'

const DEFAULT_PROPS = {
	lang: '',
	dayString: '',
	stage: 0 as ReviewStages,
	currentCardIndex: -1,
}

type ReviewProps = typeof DEFAULT_PROPS

type ReviewActions = {
	skipReviewUnreviewed: () => void
	skipReviewAgains: () => void
	gotoReviewUnreviewed: (i: number) => void
	gotoReviewAgains: (i: number) => void
	gotoIndex: (i: number) => void
	gotoNext: () => void
	gotoPrevious: () => void
	init: (
		lang: string,
		dayString: string,
		stage?: ReviewStages,
		index?: number
	) => void
}

export type ReviewState = ReviewProps & {
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

						init: (lang: string, dayString: string, stage = 1, index = 0) =>
							set((state) => {
								// if the lang doesn't match, we have an error
								if (lang !== state.lang || dayString !== state.dayString)
									throw new Error(
										'Mismatching language or dayString between params and current store state'
									)
								// ensure we only init once
								if (state.stage) return state
								return {
									currentCardIndex: index,
									stage,
								}
							}),

						/*addReview: (review: ReviewRow) =>
							set((state) => ({
								reviewsMap: {
									...state.reviewsMap,
									[review.phrase_id!]: review,
								},
							})),*/
					},
				}),
				{
					name: `sunlo-review:${lang}-${dayString}`,
					partialize: (state): ReviewProps => ({
						lang: state.lang,
						dayString: state.dayString,
						stage: state.stage,
						currentCardIndex: state.currentCardIndex,
					}),
				}
			)
		)
	)
}

export function useNextValid(): number {
	const currentCardIndex = useCardIndex()
	const lang = useReviewLang()
	const day_session = useReviewDayString()
	const stage = useReviewStage()
	const { data: reviewsData } = useReviewsToday(lang, day_session)
	const { manifest, reviewsMap } = reviewsData
	return stage < 3 ?
			getIndexOfNextUnreviewedCard(manifest!, reviewsMap, currentCardIndex)
		:	getIndexOfNextAgainCard(manifest!, reviewsMap, currentCardIndex)
}

export function getIndexOfNextUnreviewedCard(
	manifest: pids,
	reviewsMap: ReviewsMap,
	currentCardIndex: number
) {
	const index = manifest.findIndex((pid, i) => {
		// if we're currently at card 3 of 40, don't even check cards 0-3
		// but if we're at 40/40 we should check from the start
		if (currentCardIndex !== manifest.length && i <= currentCardIndex)
			return false
		// if the entry is undefined, it means we haven't reviewed this card yet
		return !reviewsMap[pid]
	})

	return index !== -1 ? index : manifest.length
}

export function getIndexOfNextAgainCard(
	manifest: pids,
	reviewsMap: ReviewsMap,
	currentCardIndex: number
) {
	const index = manifest.findIndex((_, i) => {
		// we want first to check state.currentCardIndex + 1
		const indexChecking = (i + currentCardIndex + 1) % manifest.length
		return reviewsMap[manifest[indexChecking]]?.score === 1
	})
	return index !== -1 ?
			(index + currentCardIndex + 1) % manifest.length
		:	manifest.length
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
