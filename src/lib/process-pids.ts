import { DeckPids, PhrasesMap, pids } from '@/types/main'
import { useMemo } from 'react'
import { useDeckPids } from './use-deck'
import { useLanguagePhrasesMap, useLanguagePids } from './use-language'

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

export function useDeckPidsAndRecs(lang: string) {
	// these two select from the same cache key
	const { data: phrasesMap, isPending: isPending1 } =
		useLanguagePhrasesMap(lang)
	const { data: languagePids, isPending: isPending2 } = useLanguagePids(lang)

	// this query requires auth, which is why it's separate
	const { data: deckPids, isPending: isPending3 } = useDeckPids(lang)

	// derived data requiring all all three results
	return useMemo(() => {
		if (
			(!phrasesMap && !isPending1) ||
			(!languagePids && !isPending2) ||
			(!deckPids && !isPending3)
		) {
			throw new Error(
				'Attempting to call useDeckPidsAndRecs in a situation where the required data is neither present nor pending.'
			)
		}
		// Now `null` always means pending because we always throw errors.
		return !phrasesMap || !languagePids || !deckPids ?
				null
			:	processPids(phrasesMap, languagePids, deckPids)
	}, [languagePids, deckPids, phrasesMap])
}
