// Feature: deck — Decks, cards, deck mutations
// Public API for the deck domain

// Schemas & types
export {
	DeckMetaSchema,
	DeckMetaRawSchema,
	type DeckMetaType,
	type DeckMetaRawType,
	CardMetaSchema,
	type CardMetaType,
	CardStatusEnumSchema,
	type CardStatusEnumType,
	CardDirectionSchema,
	type CardDirectionType,
} from './schemas'

// Collections
export { decksCollection, cardsCollection } from './collections'

// Hooks
export {
	useDecks,
	useDeckMeta,
	useMyCard,
	useDeckCards,
	useDeckPids,
	useDeckRoutineStats,
	useDeckActivityChartData,
	usePreferredTranslationLang,
	useReviewAnswerMode,
	type DeckPids,
} from './hooks'

// Card utilities
export { isDueCard } from './is-due-card'

// Mutations
export { useNewDeckMutation } from './mutations'

// Utilities
export { directionsForPhrase } from './card-directions'
