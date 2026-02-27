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
} from '@/lib/schemas/deck'

// Collections
export { decksCollection, cardsCollection } from '@/lib/collections/deck'

// Hooks
export {
	useDecks,
	useDeckMeta,
	useDeckCards,
	useDeckPids,
	useDeckRoutineStats,
	useDeckActivityChartData,
	usePreferredTranslationLang,
	type DeckPids,
} from '@/hooks/use-deck'

// Mutations
export { useNewDeckMutation } from '@/lib/mutate-deck'
