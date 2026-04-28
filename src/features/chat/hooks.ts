import { useMutation } from '@tanstack/react-query'
import { chatSearch, type ChatSearchInput } from './api'
import { useChatStore } from './store'
import type { ChatQueryType, ChatResultPhraseType } from './schemas'

export const useChatLang = (): string => useChatStore((s) => s.lang)
export const useChatTurns = () => useChatStore((s) => s.turns)
export const useChatCart = () => useChatStore((s) => s.cart)
export const useChatSelection = () => useChatStore((s) => s.selection)

export const useChatSearch = () => {
	const lang = useChatStore((s) => s.lang)
	const startTurn = useChatStore((s) => s.startTurn)
	const completeTurn = useChatStore((s) => s.completeTurn)
	const failTurn = useChatStore((s) => s.failTurn)
	const clearSelection = useChatStore((s) => s.clearSelection)
	const turns = useChatStore((s) => s.turns)

	return useMutation<ChatResultPhraseType[], Error, { query: ChatQueryType }>({
		mutationFn: async ({ query }) => {
			const turnId = startTurn(lang, query)
			// Anchor pivots consume the current selection — clear it so the
			// next round's additions form a fresh anchor set.
			if (query.kind === 'anchor') clearSelection()

			const shownPids = turns.flatMap((t) => t.results ?? []).map((p) => p.id)
			const input: ChatSearchInput = {
				lang,
				excludePids: shownPids,
				query,
			}
			try {
				const results = await chatSearch(input)
				completeTurn(turnId, results)
				return results
			} catch (err) {
				failTurn(turnId)
				throw err
			}
		},
	})
}
