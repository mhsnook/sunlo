// Feature: review — Review sessions, FSRS algorithm, review store
// Public API for the review domain

// Schemas & types
export {
	CardReviewSchema,
	type CardReviewType,
	ReviewSessionSchema,
	type ReviewSessionType,
	ReviewMilestoneSchema,
	type ReviewMilestoneType,
} from './schemas'

// Collections
export {
	cardReviewsCollection,
	reviewSessionsCollection,
	reviewMilestonesCollection,
} from './collections'

// Pure utilities (no supabase dependency)
export {
	buildReviewsMap,
	firstTryReviewMap,
	getIndexOfNextUnreviewedCard,
	getIndexOfNextAgainCard,
	type ReviewStages,
	type ReviewsMap,
} from './review-utils'

// Hooks
export {
	useNextValid,
	useReviewsToday,
	useReviewsTodayStats,
	useReviewDay,
	useOneReviewToday,
	useLatestReviewForPhrase,
	useReviewMutation,
	useOneCardReviews,
	useUpdateReviewStage,
	useActiveReviewRemaining,
	type ReviewStats,
} from './hooks'

// Store
export {
	useReviewActions,
	useReviewLang,
	useCardIndex,
	useReviewStore,
} from './store'

// Manifest utilities
export {
	toManifestEntry,
	parseManifestEntry,
	manifestPhraseId,
	type ManifestEntry,
} from './manifest'

// Algorithm
export {
	calculateFSRS,
	calculateInterval,
	retrievability,
	type Score,
} from './fsrs'

// Bury-siblings policy
export {
	decideBuryDirection,
	partitionBuriedSiblings,
	type BurySiblingCandidate,
} from './bury-siblings'
