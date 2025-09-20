import { useMemo } from 'react'
import { useDeckPids } from '@/hooks/use-deck'
import { useLanguagePids, useLanguagePhrasesMap } from '@/hooks/use-language'
import { arrayDifference } from '@/lib/utils'
import { useProfile } from '@/hooks/use-profile'
import { splitPhraseTranslations } from '@/hooks/composite-phrase'

/**
 * This hook computes the top recommended phrases for a user, and other
 * data points that require combining information from across deck, language,
 * and profile.
 */
export function useCompositePids(lang: string) {
	const { data: profile } = useProfile()
	const { data: phrasesMap } = useLanguagePhrasesMap(lang)
	const { data: languagePids } = useLanguagePids(lang)
	const { data: deckPids } = useDeckPids(lang)

	return useMemo(() => {
		if (!profile || !phrasesMap || !languagePids || !deckPids) {
			return null
		}

		// First, filter phrases to only those with translations the user can see.
		const language_filtered = Object.values(phrasesMap)
			.filter(Boolean) // Ensure phrase exists
			.map((p) => splitPhraseTranslations(p, profile.languagesToShow))
			.filter((p) => p.translations_mine.length > 0)
			.map((p) => p.id!)

		const not_in_deck = arrayDifference(language_filtered, [deckPids.all])

		// Then, get the pool of selectable phrases
		const language_selectables = arrayDifference(language_filtered, [
			deckPids.reviewed_or_inactive,
		])

		// Sort them in various ways
		const easiest = language_selectables.toSorted(
			(pid1, pid2) =>
				(phrasesMap[pid1]?.avg_difficulty ?? 99) -
				(phrasesMap[pid2]?.avg_difficulty ?? 99)
		)
		const popular = language_selectables.toSorted(
			(pid1, pid2) =>
				(phrasesMap[pid2]?.count_cards ?? 0) -
				(phrasesMap[pid1]?.count_cards ?? 0)
		)
		const newest = language_selectables.toSorted((pid1, pid2) =>
			(
				(phrasesMap[pid2]?.created_at ?? '') >
				(phrasesMap[pid1]?.created_at ?? '')
			) ?
				1
			:	-1
		)

		// Pick the top 8, ensuring no overlaps
		const popular8 = popular.slice(0, 8)
		const easiest8 = arrayDifference(easiest, [popular8]).slice(0, 8)
		const newest8 = arrayDifference(newest, [popular8, easiest8]).slice(0, 8)

		return {
			top8: {
				easiest: easiest8,
				popular: popular8,
				newest: newest8,
			},
			language: languagePids,
			language_selectables,
			language_filtered,
			not_in_deck,
			language_no_translations: arrayDifference(languagePids, [
				language_filtered,
			]),
		}
	}, [languagePids, deckPids, phrasesMap, profile?.languagesToShow])
}
