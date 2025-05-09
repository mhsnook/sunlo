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
	const base = {
		language: new Set(languagePids),
		deck: new Set(deckPids.all),
		active: new Set(deckPids.active),
		// reviewed: new Set(deckPids.reviewed),
		reviewed_or_inactive: new Set(deckPids.reviewed_or_inactive),
		unreviewed_active: new Set(deckPids.unreviewed_active),
		reviewed_last_7d: new Set(deckPids.reviewed_last_7d),
		today_active: new Set(deckPids.today_active),
	}
	const language_selectables = base.language.difference(
		base.reviewed_or_inactive
	)
	const arr_language_selectables = Array.from(language_selectables)
	const easiest = arr_language_selectables.toSorted(
		(pid1, pid2) =>
			// prioritize LOWER values
			phrasesMap[pid1].avg_difficulty! - phrasesMap[pid2].avg_difficulty!
	)
	const popular = arr_language_selectables.toSorted(
		(pid1, pid2) =>
			// prioritize HIGHER values
			phrasesMap[pid2].count_cards! - phrasesMap[pid1].count_cards!
	)
	const newest = arr_language_selectables.toSorted((pid1, pid2) =>
		phrasesMap[pid2].created_at! === phrasesMap[pid1].created_at! ? 0
		: (
			// prioritize HIGHER values
			phrasesMap[pid2].created_at! > phrasesMap[pid1].created_at!
		) ?
			1
		:	-1
	)

	return {
		...base,
		inactive: base.deck.difference(base.active),
		language_selectables,

		top8: {
			easiest: new Set(easiest.slice(0, 8)),
			popular: new Set(popular.slice(0, 8)),
			newest: new Set(newest.slice(0, 8)),
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
