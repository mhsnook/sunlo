import { queryOptions, useQuery } from '@tanstack/react-query'
import { useLiveQuery } from '@tanstack/react-db'
import { eq } from '@tanstack/react-db'
import type { LanguageLoaded, pids, uuid } from '@/types/main'
import supabase from '@/lib/supabase-client'
import { phrasesCollection, publicProfilesCollection } from '@/lib/collections'
import { PhraseFullType, PublicProfileSchema } from '@/lib/schemas'

/**
 * Fetches the language metadata and all its associated phrases from the database.
 * This is the raw data loading function.
 */
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
	const { phrases: phrasesRaw, ...meta } = data
	const pids: pids = phrasesRaw?.map((p) => p.id!) ?? []

	const profiles = (phrasesRaw ?? []).map((p) =>
		PublicProfileSchema.parse(p.added_by_profile)
	)

	return {
		meta,
		pids,
		profiles,
		phrases: phrasesRaw,
	}
}

export const languageQueryOptions = (lang: string) =>
	queryOptions({
		queryKey: ['language', lang],
		queryFn: async () => {
			const loaded = await fetchLanguage(lang)
			// Imperatively populate the collections
			if (loaded.phrases.length > 0) {
				phrasesCollection.upsert(loaded.phrases)
			}
			if (loaded.profiles.length > 0) {
				publicProfilesCollection.upsert(loaded.profiles)
			}
			return { meta: loaded.meta, pids: loaded.pids }
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

/**
 * Gets a single phrase directly from the reactive phrasesCollection.
 */
export const useLanguagePhrase = (pid: uuid | null) => {
	const { data } = useLiveQuery(
		(q) =>
			q
				.from({ phrase: phrasesCollection })
				.where(({ phrase }) => eq(phrase.id, pid!)),
		{ enabled: !!pid }
	)
	return data?.[0] as PhraseFullType | undefined
}

const selectTags = (data: LanguageLoaded) => data.meta.tags
export const useLanguageTags = (lang: string) =>
	useQuery({
		...languageQueryOptions(lang),
		select: selectTags,
	})
