import { DeckPids, PhrasesMap, pids, TranslationRow } from '@/types/main'
import { useMemo } from 'react'
import { useDeckPids } from './use-deck'
import { useLanguagePhrasesMap, useLanguagePids } from './use-language'
import { arrayDifference, mapArray } from './utils'
import { useProfile } from './use-profile'

export type ProcessedDeckAndPids = ReturnType<typeof processDeckPidsAndRecs>

function splitTranslations(
	translationLangs: Array<string>,
	translations_incoming: Array<TranslationRow>
): {
	translations_mine: Array<TranslationRow>
	translations_other: Array<TranslationRow>
} {
	const translations_mine = translations_incoming
		.filter((t) => translationLangs.indexOf(t.lang) > -1)
		.toSorted((a, b) => {
			return a.lang === b.lang ?
					0
				:	translationLangs.indexOf(a.lang) - translationLangs.indexOf(b.lang)
		})
	const translations_other = translations_incoming.filter(
		(t) => !translationLangs.includes(t.lang)
	)

	return {
		translations_mine,
		translations_other,
	}
}

function processDeckPidsAndRecs(
	translationLangs: Array<string>,
	phrasesMap: PhrasesMap,
	languagePids: pids,
	deckPids: DeckPids
) {
	// filter to only spoken languages, sort primary first
	const phrasesArrayFiltered = languagePids
		.map((pid) => {
			let phrase = phrasesMap[pid]

			const { translations_mine, translations_other } = splitTranslations(
				translationLangs,
				[...phrase.translations]
			)
			phrase.translations_mine = translations_mine
			phrase.translations_other = translations_other

			return phrase
		})
		.filter((p) => p.id)

	const languagePidsFiltered = phrasesArrayFiltered
		.filter((p) => p.translations.length > 0 && p.id !== null)
		.map((p) => p.id!)
	const phrasesMapFiltered: PhrasesMap = mapArray(phrasesArrayFiltered, 'id')

	const language_selectables = arrayDifference(languagePidsFiltered, [
		deckPids.reviewed_or_inactive,
	])

	const easiest = language_selectables.toSorted(
		(pid1, pid2) =>
			// prioritize LOWER values
			phrasesMap[pid1].avg_difficulty! - phrasesMap[pid2].avg_difficulty!
	)
	const popular = language_selectables.toSorted(
		(pid1, pid2) =>
			// prioritize HIGHER values
			phrasesMap[pid2].count_cards! - phrasesMap[pid1].count_cards!
	)
	const newest = language_selectables.toSorted((pid1, pid2) =>
		phrasesMap[pid2].created_at! === phrasesMap[pid1].created_at! ? 0
		: (
			// prioritize HIGHER values
			phrasesMap[pid2].created_at! > phrasesMap[pid1].created_at!
		) ?
			1
		:	-1
	)

	const popular8 = popular.slice(0, 8)
	const easiest8 = arrayDifference(easiest, [popular8]).slice(0, 8)
	const newest8 = arrayDifference(newest, [popular8, easiest8]).slice(0, 8)

	return {
		language: languagePids,
		language_filtered: languagePidsFiltered,
		language_no_translations: arrayDifference(languagePids, [
			languagePidsFiltered,
		]),
		deck: deckPids.all,
		not_in_deck: arrayDifference(languagePids, [deckPids.all]),
		active: deckPids.active,
		reviewed_or_inactive: deckPids.reviewed_or_inactive,
		inactive: arrayDifference(deckPids.all, [deckPids.active]),
		language_selectables,
		unreviewed_active: deckPids.unreviewed_active,
		reviewed_last_7d: deckPids.reviewed_last_7d,
		today_active: deckPids.today_active,
		top8: {
			easiest: easiest8,
			popular: popular8,
			newest: newest8,
		},
		phrasesMapFiltered,
	}
}

export function useDeckPidsAndRecs(lang: string) {
	const { data: profile } = useProfile()

	// these two select from the same cache key
	const { data: phrasesMap /*, isPending: isPending1 */ } =
		useLanguagePhrasesMap(lang)
	const { data: languagePids /*, isPending: isPending2 */ } =
		useLanguagePids(lang)

	// this query requires auth, which is why it's separate
	const { data: deckPids /*, isPending: isPending3 */ } = useDeckPids(lang)

	// derived data requiring all all three results
	return useMemo(() => {
		if (!profile) throw new Error('Profile is not even present...')
		if (!phrasesMap || !languagePids || !deckPids) {
			throw new Error(
				'Attempting to call useDeckPidsAndRecs in a situation where the required data is neither present nor pending.'
			)
		}
		// Now `null` always means pending because we always throw errors.
		return processDeckPidsAndRecs(
			[profile.language_primary, ...profile.languages_spoken],
			phrasesMap,
			languagePids,
			deckPids
		)
	}, [languagePids, deckPids, phrasesMap, profile])
}
