import { queryOptions, useQuery } from '@tanstack/react-query'
import supabase from '@/lib/supabase-client'
import { useAuth } from '@/lib/hooks'
import { PhraseRow, TranslationRow, uuid } from '@/types/main'

const phraseRequestFragment = `*,
	requester:public_profile!phrase_request_requester_uid_fkey(*),
	phrases:meta_phrase_info(*, translations:phrase_translation(*), added_by_profile:public_profile!phrase_added_by_fkey(*))
` as const

export const allMyPhraseRequestsQuery = (lang: string, userId: uuid) =>
	queryOptions({
		queryKey: ['user', 'phrase_requests', lang],
		queryFn: async () => {
			const { data } = await supabase
				.from('phrase_request')
				.select(phraseRequestFragment)
				.eq('requester_uid', userId!)
				.eq('lang', lang)
				.order('created_at', { ascending: false })
				.throwOnError()

			return data
		},
	})

export function useAllMyPhraseRequests(lang: string) {
	const { userId } = useAuth()
	return useQuery({
		...allMyPhraseRequestsQuery(lang, userId!),
		enabled: !!userId,
	})
}

export async function getOneFullPhraseRequest(id: uuid) {
	const { data } = await supabase
		.from('phrase_request')
		.select(phraseRequestFragment)
		.eq('id', id)
		.maybeSingle()
		.throwOnError()
	return data
}

export type PhraseRequestFull = Awaited<
	ReturnType<typeof getOneFullPhraseRequest>
>

export function phraseRequestQuery(id: string) {
	return {
		queryKey: ['phrase_request', id],
		queryFn: async () => await getOneFullPhraseRequest(id),
	}
}

export type FulfillRequestResponse = {
	phrase: PhraseRow
	translation: TranslationRow
}
