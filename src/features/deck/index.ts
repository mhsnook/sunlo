// Feature: deck — Decks, cards, deck mutations
// Public API for the deck domain

// Schemas & types
export {
	DeckSchema,
	type DeckType,
	CardMetaSchema,
	type CardMetaType,
	CardStatusEnumSchema,
	CardDirectionSchema,
	type CardDirectionType,
} from './schemas'

// Collections
export { decksCollection, cardsCollection } from './collections'

// Hooks
export {
	useDecks,
	useDeck,
	useMyCard,
	useCardScheduling,
	useDeckCards,
	useDeckPids,
	useDeckRoutineStats,
	useDeckActivityChartData,
	usePreferredTranslationLang,
	useReviewAnswerMode,
} from './hooks'

// Live collections
export { cardsWithReviews } from './live'

// Card utilities
export { isDueCard } from './is-due-card'
export {
	schedulingFromReviews,
	NO_SCHEDULING,
	type CardScheduling,
} from './card-scheduling'

// Mutations
export { useCreateDeck, optimisticNewDeck } from './mutations'

// Utilities
export { directionsForPhrase } from './card-directions'
