import {
	type UseQueryResult,
	queryOptions,
	useQuery,
	useSuspenseQuery,
} from '@tanstack/react-query'
import type {
	LanguageFetched,
	LanguageLoaded,
	LanguageMeta,
	PhrasesMap,
	PhraseFull,
	pids,
	uuid,
} from '@/types/main'
import supabase from '@/lib/supabase-client'
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
	useQuery({ ...languageQueryOptions(lang) }) as UseQueryResult<LanguageLoaded>

export const useLanguageMeta = (lang: string) =>
	useQuery({
		...languageQueryOptions(lang),
		select: (data: LanguageLoaded) => data.meta,
	}) as UseQueryResult<LanguageMeta>

export const useLanguagePids = (lang: string) =>
	useQuery({
		...languageQueryOptions(lang),
		select: (data: LanguageLoaded) => data.pids,
	}) as UseQueryResult<pids>

export const useLanguagePhrasesMap = (lang: string) =>
	useQuery({
		...languageQueryOptions(lang),
		select: (data: LanguageLoaded) => data.phrasesMap,
	}) as UseQueryResult<PhrasesMap>

export const useLanguagePhrase = (pid: uuid | null, lang: string | null) =>
	useQuery({
		...languageQueryOptions(lang!),
		select: (data: LanguageLoaded) => data.phrasesMap[pid!],
		enabled: !!pid && !!lang,
	}) as UseQueryResult<PhraseFull>

export const useLanguagePhraseSuspense = (pid: uuid, lang: string) =>
	useSuspenseQuery({
		...languageQueryOptions(lang),
		select: (data: LanguageLoaded) => data.phrasesMap[pid],
	}) as UseQueryResult<PhraseFull>

export const useLanguageTags = (lang: string) =>
	useQuery({
		...languageQueryOptions(lang),
		select: (data: LanguageLoaded) => data.meta.tags,
	})
