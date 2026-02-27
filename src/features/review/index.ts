// Feature: review — Review sessions, FSRS algorithm, review store
// Public API for the review domain

// Schemas & types
export {
	CardReviewSchema,
	type CardReviewType,
	DailyReviewStateSchema,
	type DailyReviewStateType,
} from '@/lib/schemas/review'

// Collections
export {
	cardReviewsCollection,
	reviewDaysCollection,
} from '@/lib/collections/review'

// Hooks
export {
	useReviewsToday,
	useReviewsTodayStats,
	useReviewDay,
	useOneReviewToday,
	useLatestReviewForPhrase,
	useReviewMutation,
	useOneCardReviews,
	useUpdateReviewStage,
	useActiveReviewRemaining,
	type ReviewStages,
	type ReviewsMap,
	type ReviewStats,
} from '@/hooks/use-reviews'

// Store
export {
	useReviewActions,
	useReviewLang,
	useCardIndex,
	useNextValid,
	getIndexOfNextUnreviewedCard,
	getIndexOfNextAgainCard,
	useReviewStore,
} from '@/hooks/use-review-store'

// Algorithm
export { calculateFSRS, retrievability, type Score } from '@/lib/fsrs'
