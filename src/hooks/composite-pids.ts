import { useMemo } from 'react'
import { useDeckPids } from '@/hooks/use-deck'
import { useLanguagePhrasesArray, useLanguagePids } from '@/hooks/use-language'
import { arrayDifference, arrayOverlap } from '@/lib/utils'
import { useProfile } from '@/hooks/use-profile'
import { splitPhraseTranslations } from '@/hooks/composite-phrase'

/**
 * This hook computes the top recommended phrases for a user, and other
 * data points that require combining information from across deck, language,
 * and profile.
 */
export function useCompositePids(lang: string) {
	const { data: profile } = useProfile()
	const { data: phrases } = useLanguagePhrasesArray(lang)
	const { data: languagePids } = useLanguagePids(lang)
	const { data: deckPids } = useDeckPids(lang)

	return useMemo(() => {
		if (!profile?.languagesToShow || !phrases || !languagePids || !deckPids) {
			return null
		}

		// First, filter phrases to only those with translations the user can see.
		const language_filtered = phrases
			.map((p) => splitPhraseTranslations(p, profile.languagesToShow))
			.filter((p) => p.translations_mine.length > 0)
			.map((p) => p.id!)

		const not_in_deck = arrayDifference(language_filtered, [deckPids.all])

		// Then, get the pool of selectable phrases
		const language_selectables = arrayDifference(language_filtered, [
			deckPids.reviewed_or_inactive,
		])

		// Sort them in various ways
		const easiest = arrayOverlap(
			phrases
				.toSorted(
					(p1, p2) => (p1.avg_difficulty ?? 99) - (p2.avg_difficulty ?? 99)
				)
				.map((p) => p.id!),
			language_selectables
		)

		const popular = arrayOverlap(
			phrases
				.toSorted((p1, p2) => (p2.count_cards ?? 0) - (p1.count_cards ?? 0))
				.map((p) => p.id!),
			language_selectables
		)

		const newest = arrayOverlap(
			phrases
				.toSorted((p1, p2) =>
					(p2.created_at ?? '') > (p1.created_at ?? '') ? 1 : -1
				)
				.map((p) => p.id),
			language_selectables
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
	}, [languagePids, deckPids, phrases, profile?.languagesToShow])
}
