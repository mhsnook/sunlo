import {
	PhraseFull,
	PhraseStub,
	TranslationRow,
	TranslationStub,
} from '@/types/main'

function splitTranslations(
	translationLangs: Array<string>,
	translations_incoming: Array<TranslationRow | TranslationStub>
): {
	translations_mine: Array<TranslationRow>
	translations_other: Array<TranslationRow>
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
	phrase: PhraseFull | PhraseStub,
	languagesToShow: Array<string>
): (PhraseFull | PhraseStub) & {
	translations_mine: Array<TranslationRow | TranslationStub>
	translations_other: Array<TranslationRow | TranslationStub>
} {
	const { translations_mine, translations_other } = splitTranslations(
		languagesToShow,
		phrase.translations
	)

	return { ...phrase, translations_mine, translations_other }
}
