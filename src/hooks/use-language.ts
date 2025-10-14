import { queryOptions, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import type { LanguageLoaded, pids, uuid } from '@/types/main'
import supabase from '@/lib/supabase-client'
import {
	languagesCollection,
	phraseRequestsCollection,
	phrasesCollection,
	publicProfilesCollection,
} from '@/lib/collections'
import {
	LanguageSchema,
	PhraseFullSchema,
	PhraseFullType,
	PhraseRequestSchema,
	PublicProfileSchema,
} from '@/lib/schemas'
import { mapArray } from '@/lib/utils'
import { useCallback } from 'react'

/**
 * Fetches the language metadata and all its associated phrases from the database.
 * This is the raw data loading function.
 */
export async function fetchLanguage(lang: string): Promise<LanguageLoaded> {
	const { data } = await supabase
		.from('language_plus')
		.select(
			`*, phrases:meta_phrase_info(*, translations:phrase_translation(*)), requests:meta_phrase_request(*)`
		)
		.eq('lang', lang)
		.maybeSingle()
		.throwOnError()
	if (!data)
		throw Error(
			`This language was not found in the database. Please double check the language code in your URL or report a bug to an admin. (The language code provided: ${lang}. This should be a 3-character string like "eng" or "hin".) ${lang.length > 3 ? `Maybe you meant "${lang.substring(0, 3)}"?` : ''}`
		)
	const { phrases: phrasesRaw, requests: requestsRaw, ...meta } = data
	const pids: pids = phrasesRaw?.map((p) => p.id!) ?? []

	const profiles1 = (phrasesRaw ?? []).map((p) => p.added_by_profile)
	const profiles2 = (requestsRaw ?? []).map((r) => r.requester)
	const phrasesArray = phrasesRaw.map((i) => PhraseFullSchema.parse(i))
	const phrasesMap = mapArray<PhraseFullType, 'id'>(phrasesArray, 'id')
	return {
		meta: LanguageSchema.parse(meta),
		pids,
		profiles: [...profiles1, ...profiles2].map((i) =>
			PublicProfileSchema.parse(i)
		),
		requests: requestsRaw.map((i) => PhraseRequestSchema.parse(i)),
		phrases: phrasesArray,
		phrasesMap,
	}
}

export const languageQueryOptions = (lang: string) =>
	queryOptions({
		queryKey: ['language', lang],
		queryFn: async () => {
			const loaded = await fetchLanguage(lang)
			if (!loaded) return null
			// Imperatively populate the collections
			if (loaded.phrases.length > 0) {
				phrasesCollection.insert(loaded.phrases)
			}
			if (loaded.requests.length > 0) {
				phraseRequestsCollection.insert(loaded.requests)
			}
			if (loaded.profiles.length > 0) {
				publicProfilesCollection.insert(loaded.profiles)
			}
			languagesCollection.insert(LanguageSchema.parse(loaded.meta))

			return {
				meta: loaded.meta,
				pids: loaded.pids,
				phrasesMap: loaded.phrasesMap,
			}
		},
		enabled: lang.length === 3,
		// The data is now normalized in the collection, so we can treat this as stable
		staleTime: Infinity,
	})

/**
 * This is the main hook for loading a language's data.
 * It fetches metadata and populates the global phrasesCollection.
 */
export const useLanguageLoader = (lang: string) =>
	useQuery(languageQueryOptions(lang))

const selectMeta = (data: LanguageLoaded) => data.meta
export const useLanguageMeta = (lang: string) =>
	useQuery({
		...languageQueryOptions(lang),
		select: selectMeta,
	})

const selectPids = (data: LanguageLoaded) => data.pids
export const useLanguagePids = (lang: string) =>
	useQuery({
		...languageQueryOptions(lang),
		select: selectPids,
	})

const selectMap = (data: LanguageLoaded) => data.phrasesMap
export const useLanguagePhrasesMap = (lang: string) =>
	useQuery({ ...languageQueryOptions(lang), select: selectMap })

export const useLanguagePhrase = (pid: uuid | null, lang: string | null) => {
	const selectPhrase = useCallback(
		(data: LanguageLoaded) => data.phrasesMap[pid!],
		[pid]
	)
	return useQuery({
		...languageQueryOptions(lang!),
		select: selectPhrase,
		enabled: !!pid && !!lang,
	})
}

export const useLanguagePhraseSuspense = (pid: uuid, lang: string) => {
	const selectPhrase = useCallback(
		(data: LanguageLoaded) => data.phrasesMap[pid],
		[pid]
	)
	return useSuspenseQuery({
		...languageQueryOptions(lang),
		select: selectPhrase,
	})
}

const selectTags = (data: LanguageLoaded) => data.meta.tags
export const useLanguageTags = (lang: string) =>
	useQuery({
		...languageQueryOptions(lang),
		select: selectTags,
	})
