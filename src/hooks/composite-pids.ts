import type { pids, uuid } from '@/types/main'
import { useDeckPids } from '@/hooks/use-deck'
import { useLanguagePhrases } from '@/hooks/use-language'
import { arrayDifference } from '@/lib/utils'
import { useLanguagesToShow } from '@/hooks/use-profile'
import { splitPhraseTranslations } from '@/hooks/composite-phrase'
import type { PhraseFullType } from '@/lib/schemas'

/**
 * This hook computes the top recommended phrases for a user, and other
 * data points that require combining information from across deck, language,
 * and profile.
 */

export type CompositePids = {
	top8: {
		easiest: pids
		popular: pids
		newest: pids
	}
	language: pids
	language_selectables: pids
	language_filtered: pids
	not_in_deck: pids
	language_no_translations: pids
}
export function useCompositePids(lang: string) {
	const { data: phrases } = useLanguagePhrases(lang)
	const { data: deckPids } = useDeckPids(lang)
	const { data: languagesToShow } = useLanguagesToShow()

	// Create a Map for fast phrase lookups by ID
	const phrasesMap = new Map<uuid, PhraseFullType>(
		phrases?.map((p) => [p.id, p])
	)

	if (!languagesToShow || !phrases || !deckPids) {
		return null
	}
	const languagePids = phrases.map((p) => p.id)

	// First, filter phrases to only those with translations the user can see.
	const pidsICanSee = phrases
		.map((p) => splitPhraseTranslations(p, languagesToShow))
		.filter((p) => p.translations_mine.length > 0)
		.map((p) => p.id)

	const pidsNotInDeck = arrayDifference(pidsICanSee, [deckPids.all])

	// Then, get the pool of selectable phrases
	const pidsSelectable = arrayDifference(pidsICanSee, [
		deckPids.reviewed_or_inactive,
	])
	// Sort them in various ways
	const easiest = pidsSelectable.toSorted(
		(pid1, pid2) =>
			(phrasesMap.get(pid1)?.avg_difficulty ?? 99) -
			(phrasesMap.get(pid2)?.avg_difficulty ?? 99)
	)
	const popular = pidsSelectable.toSorted(
		(pid1, pid2) =>
			(phrasesMap.get(pid2)?.count_cards ?? 0) -
			(phrasesMap.get(pid1)?.count_cards ?? 0)
	)
	const newest = pidsSelectable.toSorted((pid1, pid2) =>
		(
			(phrasesMap.get(pid2)?.created_at ?? '') >
			(phrasesMap.get(pid1)?.created_at ?? '')
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
		language_selectables: pidsSelectable,
		language_filtered: pidsICanSee,
		not_in_deck: pidsNotInDeck,
		language_no_translations: arrayDifference(languagePids, [pidsICanSee]),
	}
}
