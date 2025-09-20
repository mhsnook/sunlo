import { queryOptions, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import type {
	LanguageFetched,
	LanguageLoaded,
	PhrasesMap,
	pids,
	uuid,
} from '@/types/main'
import supabase from '@/lib/supabase-client'
import { useCallback } from 'react'
import { mapArray } from '@/lib/utils'

export async function fetchLanguage(lang: string): Promise<LanguageLoaded> {
	const { data } = await supabase
		.from('language_plus')
		.select(
			`*, phrases:meta_phrase_info(*, translations:phrase_translation(*))`
		)
		.eq('lang', lang)
		.maybeSingle()
		.throwOnError()
	if (!data)
		throw Error(
			`This language was not found in the database. Please double check the language code in your URL or report a bug to an admin. (The language code provided: ${lang}. This should be a 3-character string like "eng" or "hin".) ${lang.length > 3 ? `Maybe you meant "${lang.substring(0, 3)}"?` : ''}`
		)
	const { phrases: phrasesArray, ...meta }: LanguageFetched = data
	const pids: pids = phrasesArray?.map((p) => p.id!)
	const phrasesMap: PhrasesMap = mapArray(phrasesArray, 'id')
	return {
		meta,
		pids,
		phrasesMap,
	}
}

export const languageQueryOptions = (lang: string) =>
	queryOptions({
		queryKey: ['language', lang],
		queryFn: async ({ queryKey }) => fetchLanguage(queryKey[1]),
		enabled: lang.length === 3,
	})

export const useLanguage = (lang: string) =>
	useQuery({ ...languageQueryOptions(lang) })

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

const selectPhrasesMap = (data: LanguageLoaded) => data.phrasesMap
export const useLanguagePhrasesMap = (lang: string) =>
	useQuery({
		...languageQueryOptions(lang),
		select: selectPhrasesMap,
	})

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
