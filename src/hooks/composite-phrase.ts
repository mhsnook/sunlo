import { useLanguagePhrase } from '@/hooks/use-language'
import { useLanguagesToShow } from '@/hooks/use-profile'
import type { CompositeQueryResults, uuid } from '@/types/main'
import type {
	PhraseFullFilteredType,
	PhraseFullType,
	TranslationType,
} from '@/lib/schemas'

export const usePhrase = (
	pid: uuid
): CompositeQueryResults<PhraseFullFilteredType> => {
	const { data: languagesToShow, isLoading: isLoading1 } = useLanguagesToShow()
	const { data: phrase, isLoading: isLoading2 } = useLanguagePhrase(pid)

	if (isLoading2) return { data: null, status: 'pending' }
	if (!phrase) return { data: null, status: 'not-found' }
	if (isLoading1) return { data: phrase, status: 'partial' }
	if (!languagesToShow.length) return { data: phrase, status: 'complete' }

	const phraseFiltered = splitPhraseTranslations(phrase, languagesToShow)

	return { data: phraseFiltered as PhraseFullFilteredType, status: 'complete' }
}

function splitTranslations(
	translationLangs: Array<string>,
	translations_incoming: Array<TranslationType>
): {
	translations_mine: Array<TranslationType>
	translations_other: Array<TranslationType>
} {
	const translations_mine = translations_incoming
		.filter((t) => translationLangs.includes(t.lang))
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
export function splitPhraseTranslations(
	phrase: PhraseFullType,
	languagesToShow: Array<string>
): PhraseFullFilteredType & {
	translations_mine: Array<TranslationType>
	translations_other: Array<TranslationType>
} {
	const { translations_mine, translations_other } = splitTranslations(
		languagesToShow,
		phrase.translations
	)

	return { ...phrase, translations_mine, translations_other }
}
