import { DeckPids, PhrasesMap, pids } from '@/types/main'
import { useMemo } from 'react'

export type ProcessedPids = ReturnType<typeof processPids>

function processPids(
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

export function useProcessPids(
	phrasesMap: PhrasesMap,
	languagePids: pids,
	deckPids: DeckPids
) {
	return useMemo(
		() => processPids(phrasesMap, languagePids, deckPids),
		[languagePids, deckPids, phrasesMap]
	)
}
