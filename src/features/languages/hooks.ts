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
