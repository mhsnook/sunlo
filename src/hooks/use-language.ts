import type { pids, uuid } from '@/types/main'

import { languagesCollection } from '@/lib/collections'
import { eq, ilike, inArray, type InitialQueryBuilder } from '@tanstack/db'
import { useLiveQuery } from '@tanstack/react-db'
import { phrasesFull } from '@/lib/live-collections'

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
	lang: string,
	queryString: string,
	tags: string[],
	filteredPids: pids | null
) => {
	return useLiveQuery(
		(q) => {
			if (!queryString && !tags.length && filteredPids === null)
				return undefined
			let query = createBasePhraseQuery(q, lang)
			if (queryString)
				query = query.where(({ phrase }) =>
					ilike(phrase.searchableText, `%${queryString}%`)
				)
			if (filteredPids)
				query = query.where(({ phrase }) => inArray(phrase.id, filteredPids))
			if (tags.length) {
				query = query.fn.where(({ phrase }) => {
					if (!phrase?.tags) return false
					// This check was unreachable and can be removed.
					// if (!tags) return true
					return tags.every((selectedTag) =>
						(phrase.tags ?? []).some(
							(phraseTag) => phraseTag?.name === selectedTag
						)
					)
				})
			}
			return query
		},
		[lang, queryString, tags, filteredPids]
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
				.from({ language: languagesCollection })
				.where(({ language }) => eq(language.lang, lang))
				.findOne()
				.select(({ language }) => ({ tags: language.tags })),
		[lang]
	)
}
