import { createContext, useContext } from 'react'
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

// Per-language state lives in three keyed maps. Lang is supplied by the
// route via ChatLangContext rather than tracked in store state, so:
//  - each /chats/$lang has its own conversation, cart, and selection
//  - state survives navigation between languages and back
//  - components don't need to know which language they're rendering
type ChatStoreState = {
	turnsByLang: Record<string, ChatTurnType[]>
	cartByLang: Record<string, ChatResultPhraseType[]>
	selectionByLang: Record<string, ChatResultPhraseType[]>
	dismissedSuggestionsByLang: Record<string, Set<string>>

	startTurn: (lang: string, query: ChatQueryType) => string
	completeTurn: (
		lang: string,
		turnId: string,
		results: ChatResultPhraseType[]
	) => void
	failTurn: (lang: string, turnId: string) => void
	toggleResult: (lang: string, phrase: ChatResultPhraseType) => void
	removeFromCart: (lang: string, phraseId: string) => void
	removeFromSelection: (lang: string, phraseId: string) => void
	clearSelection: (lang: string) => void
	clearCart: (lang: string) => void
	resetConversation: (lang: string) => void
	dismissSuggestion: (
		lang: string,
		turnId: string,
		suggestionKey: string
	) => void
}

const updateMap = <T>(
	map: Record<string, T[]>,
	lang: string,
	updater: (prev: T[]) => T[]
): Record<string, T[]> => ({
	...map,
	[lang]: updater(map[lang] ?? []),
})

export const useChatStore = create<ChatStoreState>()((set) => ({
	turnsByLang: {},
	cartByLang: {},
	selectionByLang: {},
	dismissedSuggestionsByLang: {},

	startTurn: (lang, query) => {
		const id = newId()
		const turn: ChatTurnType = { id, lang, query, results: null }
		set((state) => ({
			turnsByLang: updateMap(state.turnsByLang, lang, (prev) => [
				...prev,
				turn,
			]),
		}))
		return id
	},

	completeTurn: (lang, turnId, results) =>
		set((state) => ({
			turnsByLang: updateMap(state.turnsByLang, lang, (prev) =>
				prev.map((t) => (t.id === turnId ? { ...t, results } : t))
			),
		})),

	failTurn: (lang, turnId) =>
		set((state) => ({
			turnsByLang: updateMap(state.turnsByLang, lang, (prev) =>
				prev.map((t) => (t.id === turnId ? { ...t, results: [] } : t))
			),
		})),

	toggleResult: (lang, phrase) =>
		set((state) => {
			const cart = state.cartByLang[lang] ?? []
			const selection = state.selectionByLang[lang] ?? []
			const inCart = cart.some((p) => p.id === phrase.id)
			if (inCart) {
				return {
					cartByLang: {
						...state.cartByLang,
						[lang]: cart.filter((p) => p.id !== phrase.id),
					},
					selectionByLang: {
						...state.selectionByLang,
						[lang]: selection.filter((p) => p.id !== phrase.id),
					},
				}
			}
			return {
				cartByLang: { ...state.cartByLang, [lang]: [...cart, phrase] },
				selectionByLang: {
					...state.selectionByLang,
					[lang]: [...selection, phrase],
				},
			}
		}),

	removeFromCart: (lang, phraseId) =>
		set((state) => ({
			cartByLang: updateMap(state.cartByLang, lang, (prev) =>
				prev.filter((p) => p.id !== phraseId)
			),
			selectionByLang: updateMap(state.selectionByLang, lang, (prev) =>
				prev.filter((p) => p.id !== phraseId)
			),
		})),

	removeFromSelection: (lang, phraseId) =>
		set((state) => ({
			selectionByLang: updateMap(state.selectionByLang, lang, (prev) =>
				prev.filter((p) => p.id !== phraseId)
			),
		})),

	clearSelection: (lang) =>
		set((state) => ({
			selectionByLang: { ...state.selectionByLang, [lang]: [] },
		})),

	clearCart: (lang) =>
		set((state) => ({
			cartByLang: { ...state.cartByLang, [lang]: [] },
			selectionByLang: { ...state.selectionByLang, [lang]: [] },
		})),

	resetConversation: (lang) =>
		set((state) => ({
			turnsByLang: { ...state.turnsByLang, [lang]: [] },
			cartByLang: { ...state.cartByLang, [lang]: [] },
			selectionByLang: { ...state.selectionByLang, [lang]: [] },
		})),

	dismissSuggestion: (lang, turnId, suggestionKey) =>
		set((state) => {
			const current =
				state.dismissedSuggestionsByLang[lang] ?? new Set<string>()
			const updated = new Set(current)
			updated.add(`${turnId}|${suggestionKey}`)
			return {
				dismissedSuggestionsByLang: {
					...state.dismissedSuggestionsByLang,
					[lang]: updated,
				},
			}
		}),
}))

// Context that route wraps the chat page in. All chat hooks read the lang
// from here so components don't carry it as a prop.
const ChatLangContext = createContext<string | null>(null)
export const ChatLangProvider = ChatLangContext.Provider

export function useChatRouteLang(): string {
	const lang = useContext(ChatLangContext)
	if (!lang) {
		throw new Error('useChatRouteLang must be used within <ChatLangProvider>')
	}
	return lang
}
