import { useMutation } from '@tanstack/react-query'
import { chatSearch, type ChatSearchInput } from './api'
import { useChatStore, useChatRouteLang } from './store'
import type {
	ChatQueryType,
	ChatResultPhraseType,
	ChatTurnType,
} from './schemas'

// Stable empty arrays so selectors don't return a new reference every
// render and trigger the "maximum update depth" loop.
const EMPTY_TURNS: ChatTurnType[] = []
const EMPTY_PHRASES: ChatResultPhraseType[] = []

export const useChatTurns = () => {
	const lang = useChatRouteLang()
	return useChatStore((s) => s.turnsByLang[lang] ?? EMPTY_TURNS)
}

export const useChatCart = () => {
	const lang = useChatRouteLang()
	return useChatStore((s) => s.cartByLang[lang] ?? EMPTY_PHRASES)
}

export const useChatSelection = () => {
	const lang = useChatRouteLang()
	return useChatStore((s) => s.selectionByLang[lang] ?? EMPTY_PHRASES)
}

export const useChatSearch = () => {
	const lang = useChatRouteLang()
	const startTurn = useChatStore((s) => s.startTurn)
	const completeTurn = useChatStore((s) => s.completeTurn)
	const failTurn = useChatStore((s) => s.failTurn)
	const clearSelection = useChatStore((s) => s.clearSelection)
	const turns = useChatStore((s) => s.turnsByLang[lang] ?? EMPTY_TURNS)

	return useMutation<ChatResultPhraseType[], Error, { query: ChatQueryType }>({
		mutationFn: async ({ query }) => {
			const turnId = startTurn(lang, query)
			if (query.kind === 'anchor') clearSelection(lang)

			const shownPids = turns.flatMap((t) => t.results ?? []).map((p) => p.id)
			const input: ChatSearchInput = {
				lang,
				excludePids: shownPids,
				query,
			}
			try {
				const results = await chatSearch(input)
				completeTurn(lang, turnId, results)
				return results
			} catch (err) {
				failTurn(lang, turnId)
				throw err
			}
		},
	})
}
