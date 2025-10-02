import {
	queryOptions,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
	type QueryClient,
} from '@tanstack/react-query'
import type { LanguageLoaded, pids, uuid } from '@/types/main'
import supabase from '@/lib/supabase-client'

import { PhraseFullSchema, PhraseFullType } from '@/lib/schemas'

export const phraseQuery =
	`*, translations:phrase_translation(*), phrase_request(*)` as const

export async function fetchLanguage(
	lang: string,
	queryClient: QueryClient
): Promise<LanguageLoaded> {
	const { data } = await supabase
		.from('language_plus')
		.select(`*, phrases:meta_phrase_info(${phraseQuery})`)
		.eq('lang', lang)
		.maybeSingle()
		.throwOnError()
	if (!data)
		throw Error(
			`This language was not found in the database. Please double check the language code in your URL or report a bug to an admin. (The language code provided: ${lang}. This should be a 3-character string like "eng" or "hin".) ${lang.length > 3 ? `Maybe you meant "${lang.substring(0, 3)}"?` : ''}`
		)
	const { phrases, ...meta } = data
	// Normalize the cache: store each phrase individually.
	const phrasesResult = phrases.map((p) => PhraseFullSchema.parse(p))
	phrasesResult?.forEach((phrase) => {
		if (phrase.id) {
			queryClient.setQueryData(['phrase', phrase.id], phrase)
		}
	})

	const pids: pids = phrases?.map((p) => p.id!) ?? []
	return {
		meta,
		pids,
		phrases: phrasesResult,
	}
}

export async function fetchPhrase(pid: uuid) {
	const { data } = await supabase
		.from('meta_phrase_info')
		.select(phraseQuery)
		.eq('id', pid)
		.maybeSingle()
		.throwOnError()
	if (!data) return null
	return PhraseFullSchema.parse(data)
}

export const languageQueryOptions = (lang: string, queryClient: QueryClient) =>
	queryOptions({
		queryKey: ['language', lang],
		queryFn: async (): Promise<LanguageLoaded> =>
			fetchLanguage(lang, queryClient),
		enabled: lang.length === 3,
		staleTime: 1000 * 60 * 5, // 5 minutes
	})

export const phraseQueryOptions = (pid: uuid) =>
	queryOptions({
		queryKey: ['phrase', pid],
		queryFn: async (): Promise<PhraseFullType | null> => await fetchPhrase(pid),
		staleTime: 1000 * 60 * 60, // 1 hour
	})

export const useLanguage = (lang: string) => {
	const queryClient = useQueryClient()
	useQuery({ ...languageQueryOptions(lang, queryClient) })
}

const selectMeta = (data: LanguageLoaded) => data.meta

export const useLanguageMeta = (lang: string) => {
	const queryClient = useQueryClient()

	return useQuery({
		...languageQueryOptions(lang, queryClient),
		select: selectMeta,
	})
}

const selectArray = (data: LanguageLoaded) => data.phrases

export const useLanguagePhrasesArray = (lang: string) => {
	const queryClient = useQueryClient()

	return useQuery({
		...languageQueryOptions(lang, queryClient),
		select: selectArray,
	})
}

const selectPids = (data: LanguageLoaded) => data.pids

export const useLanguagePids = (lang: string) => {
	const queryClient = useQueryClient()
	return useQuery({
		...languageQueryOptions(lang, queryClient),
		select: selectPids,
	})
}

const selectTags = (data: LanguageLoaded) => data.meta.tags

export const useLanguageTags = (lang: string) => {
	const queryClient = useQueryClient()
	return useQuery({
		...languageQueryOptions(lang, queryClient),
		select: selectTags,
	})
}

export const usePhraseOnly = (pid: uuid | null) =>
	useQuery({
		...phraseQueryOptions(pid!),
		enabled: !!pid,
	})

export const usePhraseSuspense = (pid: uuid) =>
	useSuspenseQuery({ ...phraseQueryOptions(pid) })
