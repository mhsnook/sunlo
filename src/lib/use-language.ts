import {
	type UseQueryResult,
	queryOptions,
	useQuery,
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

const qs = {
	phrase_full: () => `*, translations:phrase_translation(*)` as const,
	language_full: () =>
		`*, phrases:meta_phrase_info(${qs.phrase_full()})` as const,
}

export async function fetchLanguage(lang: string): Promise<LanguageLoaded> {
	const { data } = await supabase
		.from('language_plus')
		.select(qs.language_full())
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

export const useLanguagePhrase = (pid: uuid, lang: string) =>
	useQuery({
		...languageQueryOptions(lang),
		select: (data: LanguageLoaded) => data.phrasesMap[pid],
	}) as UseQueryResult<PhraseFull>
