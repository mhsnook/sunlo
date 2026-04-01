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
} from './schemas'

// Collections
export { decksCollection, cardsCollection } from './collections'

// Hooks
export {
	useDecks,
	useDeckMeta,
	useDeckCards,
	useDeckPids,
	useDeckRoutineStats,
	useDeckActivityChartData,
	usePreferredTranslationLang,
	useReviewAnswerMode,
	type DeckPids,
} from './hooks'

// Mutations
export { useNewDeckMutation } from './mutations'
