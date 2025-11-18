import { useLanguagePhrase } from '@/hooks/use-language'
import { useLanguagesToShow } from '@/hooks/use-profile'
import type { uuid } from '@/types/main'
import type {
	PhraseFullFilteredType,
	PhraseFullType,
	TranslationType,
} from '@/lib/schemas'

export type CompositePhraseQueryResults =
	| { status: 'pending'; data: undefined }
	| {
			status: 'complete' | 'partial'
			data: PhraseFullFilteredType
	  }
	| {
			status: 'not-found'
			data: null
	  }

export const usePhrase = (pid: uuid): CompositePhraseQueryResults => {
	const { data: languagesToShow, isLoading: isLoading1 } = useLanguagesToShow()
	const { data: phrase, isLoading: isLoading2 } = useLanguagePhrase(pid)

	if (isLoading2) return { status: 'pending', data: undefined }
	if (!phrase) return { data: null, status: 'not-found' }
	const partial: PhraseFullFilteredType = {
		...phrase,
		translations_mine: phrase.translations,
		translations_other: [],
	}
	if (isLoading1) return { data: partial, status: 'partial' }
	if (!languagesToShow.length) return { data: partial, status: 'complete' }

	const phraseFiltered: PhraseFullFilteredType = splitPhraseTranslations(
		phrase,
		languagesToShow
	)

	return { data: phraseFiltered, status: 'complete' }
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
		phrase.translations ?? []
	)

	return { ...phrase, translations_mine, translations_other }
}
