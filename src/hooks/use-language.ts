import type { uuid } from '@/types/main'

import { languagesCollection, phrasesCollection } from '@/lib/collections'
import { eq, InitialQueryBuilder } from '@tanstack/db'
import { useLiveQuery } from '@tanstack/react-db'

export const useLanguageMeta = (lang: string) =>
	useLiveQuery(
		(q) =>
			q
				.from({ language: languagesCollection })
				.where(({ language }) => eq(language.lang, lang))
				.findOne(),
		[lang]
	)

// Helper function to build the base query for phrases filtered by language
const createBasePhraseQuery = (q: InitialQueryBuilder, lang: string) =>
	q
		.from({ phrase: phrasesCollection })
		.where(({ phrase }) => eq(phrase.lang, lang))

export const useLanguagePids = (lang: string) =>
	useLiveQuery(
		(q) => createBasePhraseQuery(q, lang).select(({ phrase }) => phrase.id),
		[lang]
	)

export const useLanguagePhrases = (lang: string) =>
	useLiveQuery((q) => createBasePhraseQuery(q, lang), [lang])

// export const useLanguagePhrasesMap = (lang: string) =>

export const useLanguagePhrase = (pid: uuid | null) =>
	useLiveQuery(
		(q) =>
			q
				.from({ phrase: phrasesCollection })
				.where(({ phrase }) => eq(phrase.id, pid))
				.findOne(),
		[pid]
	)

export const useLanguageTags = (lang: string) =>
	useLiveQuery(
		(q) =>
			q
				.from({ language: languagesCollection })
				.where(({ language }) => eq(language.lang, lang))
				.findOne()
				.select(({ language }) => language.tags),
		[lang]
	)
