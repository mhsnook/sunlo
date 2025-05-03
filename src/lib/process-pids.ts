import { DeckPids, PhrasesMap, pids } from '@/types/main'
import { useLanguage } from './use-language'
import { useDeck } from './use-deck'
import { useMemo } from 'react'

export type ProcessedPids = ReturnType<typeof processPids>

export function processPids(
	phrasesMap: PhrasesMap,
	languagePids: pids,
	deckPids: DeckPids
) {
	const not_in_deck = languagePids.filter(
		(pid) => deckPids.all.indexOf(pid) === -1
	)
	return {
		language: languagePids,
		deck: deckPids.all,
		reviewed_last_7d: deckPids.reviewed_last_7d,
		not_in_deck,
		recommended: {
			by_friends: [],
			easiest: not_in_deck.toSorted(
				(pid1, pid2) =>
					// prioritize LOWER values
					phrasesMap[pid1].avg_difficulty! - phrasesMap[pid2].avg_difficulty!
			),
			popular: not_in_deck.toSorted(
				(pid1, pid2) =>
					// prioritize HIGHER values
					phrasesMap[pid2].count_cards! - phrasesMap[pid1].count_cards!
			),
			newest: not_in_deck.toSorted((pid1, pid2) =>
				phrasesMap[pid2].created_at! === phrasesMap[pid1].created_at! ? 0
				: (
					// prioritize HIGHER values
					phrasesMap[pid2].created_at! > phrasesMap[pid1].created_at!
				) ?
					1
				:	-1
			),
		},
	}
}

export function useProcessedPids(lang: string) {
	const { data: language, isPending: isPending1 } = useLanguage(lang)
	const { data: deck, isPending: isPending2 } = useDeck(lang)
	if (isPending1 || isPending2)
		return { data: null, isPending: true, error: null }
	if (!language || !deck) return {}
	const processedPids = useMemo(
		() => processPids(language.phrasesMap, language.pids, deck.pids),
		[language.pids, deck.pids, language.phrasesMap]
	)
	return {
		language,
		deck,
		processedPids,
		isPending: false,
		error: null,
	}
}
