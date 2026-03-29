import { useRef } from 'react'
import type { pids, uuid } from '@/types/main'
import { useDeckPids } from '@/features/deck/hooks'
import { useLanguagePhrases } from '@/features/phrases/hooks'
import { arrayDifference } from '@/lib/utils'
import { useLanguagesToShow } from '@/features/profile/hooks'
import { splitPhraseTranslations } from '@/hooks/composite-phrase'
import type { PhraseFullType } from '@/features/phrases/schemas'

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

	// Snapshot deck pids on first load so recommendations stay stable
	// when the user bookmarks cards from the list
	const deckPidsSnapshot = useRef<pids | null>(null)
	if (deckPidsSnapshot.current === null && deckPids) {
		deckPidsSnapshot.current = deckPids.all
	}

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

	// Get the pool of selectable phrases (excluding all cards already in deck)
	// Uses the snapshot so the list doesn't reshuffle when cards are bookmarked
	const pidsNotInDeck = arrayDifference(pidsICanSee, [
		deckPidsSnapshot.current ?? deckPids.all,
	])

	// Sort them in various ways
	const easiest = pidsNotInDeck.toSorted(
		(pid1, pid2) =>
			(phrasesMap.get(pid1)?.avg_difficulty ?? 99) -
			(phrasesMap.get(pid2)?.avg_difficulty ?? 99)
	)
	const popular = pidsNotInDeck.toSorted(
		(pid1, pid2) =>
			(phrasesMap.get(pid2)?.count_learners ?? 0) -
			(phrasesMap.get(pid1)?.count_learners ?? 0)
	)
	const newest = pidsNotInDeck.toSorted((pid1, pid2) =>
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
		language_selectables: pidsNotInDeck,
		language_filtered: pidsICanSee,
		not_in_deck: pidsNotInDeck,
		language_no_translations: arrayDifference(languagePids, [pidsICanSee]),
	}
}
