import { create } from 'zustand'
import type {
	ChatQueryType,
	ChatResultPhraseType,
	ChatTurnType,
} from './schemas'

const newId = (): string =>
	typeof crypto !== 'undefined' && 'randomUUID' in crypto
		? crypto.randomUUID()
		: Math.random().toString(36).slice(2)

// Two distinct collections:
// - cart: persistent, everything the user has added across the whole session
// - selection: transient, what drives the next "more like these" pivot.
//   Cleared on each pivot so subsequent additions are the new anchor set.
type ChatStoreState = {
	lang: string
	turns: ChatTurnType[]
	cart: ChatResultPhraseType[]
	selection: ChatResultPhraseType[]
	setLang: (lang: string) => void
	startTurn: (lang: string, query: ChatQueryType) => string
	completeTurn: (turnId: string, results: ChatResultPhraseType[]) => void
	failTurn: (turnId: string) => void
	toggleResult: (phrase: ChatResultPhraseType) => void
	removeFromCart: (phraseId: string) => void
	removeFromSelection: (phraseId: string) => void
	clearSelection: () => void
	clearCart: () => void
	resetConversation: () => void
}

export const useChatStore = create<ChatStoreState>()((set) => ({
	lang: 'spa',
	turns: [],
	cart: [],
	selection: [],

	setLang: (lang) => set({ lang, turns: [], cart: [], selection: [] }),

	startTurn: (lang, query) => {
		const id = newId()
		const turn: ChatTurnType = { id, lang, query, results: null }
		set((state) => ({ turns: [...state.turns, turn] }))
		return id
	},

	completeTurn: (turnId, results) =>
		set((state) => ({
			turns: state.turns.map((t) => (t.id === turnId ? { ...t, results } : t)),
		})),

	failTurn: (turnId) =>
		set((state) => ({
			turns: state.turns.map((t) =>
				t.id === turnId ? { ...t, results: [] } : t
			),
		})),

	toggleResult: (phrase) =>
		set((state) => {
			const inCart = state.cart.some((p) => p.id === phrase.id)
			if (inCart) {
				return {
					cart: state.cart.filter((p) => p.id !== phrase.id),
					selection: state.selection.filter((p) => p.id !== phrase.id),
				}
			}
			return {
				cart: [...state.cart, phrase],
				selection: [...state.selection, phrase],
			}
		}),

	removeFromCart: (phraseId) =>
		set((state) => ({
			cart: state.cart.filter((p) => p.id !== phraseId),
			selection: state.selection.filter((p) => p.id !== phraseId),
		})),

	removeFromSelection: (phraseId) =>
		set((state) => ({
			selection: state.selection.filter((p) => p.id !== phraseId),
		})),

	clearSelection: () => set({ selection: [] }),

	clearCart: () => set({ cart: [], selection: [] }),

	resetConversation: () => set({ turns: [], cart: [], selection: [] }),
}))
