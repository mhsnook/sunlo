import type { pids, UseLiveQueryResult, uuid } from '@/types/main'
import { and, eq, ilike, inArray } from '@tanstack/db'
import { useLiveQuery } from '@tanstack/react-db'

import { langTagsCollection, languagesCollection } from '@/lib/collections'
import { phrasesFull } from '@/lib/live-collections'
import { useLanguagesToShow } from '@/hooks/use-profile'
import { splitPhraseTranslations } from '@/hooks/composite-phrase'
import { LangTagType, LanguageType, PhraseFullType } from '@/lib/schemas'
import { useUserId } from '@/lib/use-auth'

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

export const useLanguagePhrases = (
	lang: string
): UseLiveQueryResult<PhraseFullType[]> =>
	useLiveQuery(
		(q) =>
			q
				.from({ phrase: phrasesFull })
				.where(({ phrase }) => eq(phrase.lang, lang)),
		[lang]
	)

export const useLanguagePhrasesSearch = (
	lang: string | undefined,
	queryString: string | undefined,
	tags?: string[] | null,
	filteredPids?: pids | null
): UseLiveQueryResult<PhraseFullType[]> => {
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

export const useLanguagePhrase = (
	pid: uuid | null | undefined
): UseLiveQueryResult<PhraseFullType> =>
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

export const useRequestAnswers = (
	requestId: uuid
): UseLiveQueryResult<PhraseFullType[]> => {
	return useLiveQuery(
		(q) =>
			q
				.from({ phrase: phrasesFull })
				.where(({ phrase }) => eq(phrase.request_id, requestId)),
		[requestId]
	)
}

export function useAllMyPhrasesLang(
	lang: string
): UseLiveQueryResult<PhraseFullType[]> {
	const userId = useUserId()
	return useLiveQuery(
		(q) =>
			q
				.from({ phrase: phrasesFull })
				.where(({ phrase }) =>
					and(eq(phrase.added_by, userId), eq(phrase.lang, lang))
				)
				.orderBy(({ phrase }) => phrase.created_at, 'desc'),
		[userId, lang]
	)
}
