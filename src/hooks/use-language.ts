import type { pids, uuid } from '@/types/main'
import { eq, ilike, inArray, type InitialQueryBuilder } from '@tanstack/db'
import { useLiveQuery } from '@tanstack/react-db'

import { langTagsCollection, languagesCollection } from '@/lib/collections'
import { phrasesFull } from '@/lib/live-collections'
import { useLanguagesToShow } from '@/hooks/use-profile'
import { splitPhraseTranslations } from '@/hooks/composite-phrase'

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
	q.from({ phrase: phrasesFull }).where(({ phrase }) => eq(phrase.lang, lang))

export const useLanguagePhrases = (lang: string) =>
	useLiveQuery((q) => createBasePhraseQuery(q, lang), [lang])

export const useLanguagePhrasesSearch = (
	lang: string | undefined,
	queryString: string | undefined,
	tags?: string[] | null  ,
	filteredPids?: pids | null
) => {
	const { data: langs } = useLanguagesToShow()
	return useLiveQuery(
		(q) => {
			if (!queryString && !tags?.length && !filteredPids) {
				// console.log(`useLanguagePhrasesSearch: no query`)
				return undefined
			}
			let query = q.from({ phrase: phrasesFull })
			if (lang) {
				// console.log(`useLanguagePhrasesSearch: adding lang filter ${lang}`)
				query = query.where(({ phrase }) => eq(phrase.lang, lang))
			}
			if (queryString) {
				// console.log(`useLanguagePhrasesSearch: text filter ${queryString}`)
				query = query.where(({ phrase }) =>
					ilike(phrase.searchableText, `%${queryString}%`)
				)
			}
			if (filteredPids) {
				// console.log(
				// 	`useLanguagePhrasesSearch: filtered pids: ${filteredPids.length}`
				// )
				query = query.where(({ phrase }) => inArray(phrase.id, filteredPids))
			}
			if (tags?.length) {
				// console.log(`useLanguagePhrasesSearch: tag filter ${tags}`)
				query = query.fn.where(({ phrase }) => {
					if (!phrase?.tags) return false
					return tags.every((selectedTag) =>
						(phrase.tags ?? []).some(
							(phraseTag) => phraseTag?.name === selectedTag
						)
					)
				})
			}
			return query.fn.select(({ phrase }) =>
				splitPhraseTranslations(phrase, langs)
			)
		},
		[lang, queryString, tags, filteredPids, langs]
	)
}

export const useLanguagePhrase = (pid: uuid | null | undefined) =>
	useLiveQuery(
		(q) =>
			!pid ? undefined : (
				q
					.from({ phrase: phrasesFull })
					.where(({ phrase }) => eq(phrase.id, pid))
					.findOne()
			),
		[pid]
	)

export const useLanguageTags = (lang: string) => {
	return useLiveQuery(
		(q) =>
			q
				.from({ langTag: langTagsCollection })
				.where(({ langTag }) => eq(langTag.lang, lang)),

		[lang]
	)
}

export const useRequestAnswers = (requestId: uuid) => {
	return useLiveQuery((q) =>
		q
			.from({ phrase: phrasesFull })
			.where(({ phrase }) => eq(phrase.request_id, requestId))
	)
}
