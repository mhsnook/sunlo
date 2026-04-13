import { eq, useLiveQuery } from '@tanstack/react-db'

import type { UseLiveQueryResult } from '@/types/main'
import type { LanguageType, LangTagType } from './schemas'
import { languagesCollection, langTagsCollection } from './collections'

export const useLanguageMeta = (
	lang: string
): UseLiveQueryResult<LanguageType> =>
	useLiveQuery(
		(q) =>
			q
				.from({ language: languagesCollection })
				.where(({ language }) => eq(language.lang, lang))
				.findOne(),
		[lang]
	)

export const useLanguageTags = (
	lang: string
): UseLiveQueryResult<LangTagType[]> => {
	return useLiveQuery(
		(q) =>
			q
				.from({ langTag: langTagsCollection })
				.where(({ langTag }) => eq(langTag.lang, lang)),

		[lang]
	)
}

/** All languages, no order applied. */
export const useAllLanguages = (): UseLiveQueryResult<LanguageType[]> =>
	useLiveQuery((q) => q.from({ lang: languagesCollection }))

/** All languages, sorted by `learners` desc. */
export const useLanguagesSortedByLearners = (): UseLiveQueryResult<
	LanguageType[]
> =>
	useLiveQuery((q) =>
		q
			.from({ lang: languagesCollection })
			.orderBy(({ lang }) => lang.learners, 'desc')
	)

/**
 * Languages that have at least one phrase to learn,
 * sorted by `phrases_to_learn` desc.
 */
export const useLanguagesWithPhrases = (): UseLiveQueryResult<LanguageType[]> =>
	useLiveQuery((q) =>
		q
			.from({ lang: languagesCollection })
			.fn.where(({ lang }) => (lang.phrases_to_learn ?? 0) > 0)
			.orderBy(({ lang }) => lang.phrases_to_learn, 'desc')
	)

/** All language tags across all languages. */
export const useAllLangTags = (): UseLiveQueryResult<LangTagType[]> =>
	useLiveQuery((q) => q.from({ tag: langTagsCollection }))
