import { queryOptions, useQuery } from '@tanstack/react-query'
import supabase from '@/lib/supabase-client'
import { useAuth } from '@/lib/hooks'
import { PhraseRow, TranslationRow, uuid } from '@/types/main'

export const allMyPhraseRequestsQuery = (lang: string, userId: uuid) =>
	queryOptions({
		queryKey: ['user', 'phrase_requests', lang],
		queryFn: async ({ client }) => {
			const { data } = await supabase
				.from('meta_phrase_request')
				.select()
				.eq('requester_uid', userId!)
				.eq('lang', lang)
				.order('created_at', { ascending: false })
				.throwOnError()

			// we're pulling this info anyway, we may as well cache it in the profiles cache
			if (data && data.length) {
				data.forEach((request) => {
					if (request.requester)
						client.setQueryData(
							['public', 'profile', request.requester.uid],
							request.requester
						)
				})
			}

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
	// @TODO would like to check the "my requests" cache but it is language-specific
	// and we don't have a language here 🙄
	let { data } = await supabase
		.from('meta_phrase_request')
		.select('*, phrase(*, phrase_translation(*))')
		.eq('id', id)
		.maybeSingle()
		.throwOnError()
	if (!data) return null
	if (Array.isArray(data.phrase) && Array.isArray(data.phrases)) {
		data.phrase.forEach((phrase) => {
			data.phrases!.find((p) => p.id === phrase.id).translations =
				phrase.phrase_translation
		})
	}

	return data
}

export type PhraseRequestFull = Awaited<
	ReturnType<typeof getOneFullPhraseRequest>
>

export function phraseRequestQuery(id: string) {
	return queryOptions({
		queryKey: ['phrase_request', id],
		queryFn: async () => await getOneFullPhraseRequest(id),
	})
}

export type FulfillRequestResponse = {
	phrase: PhraseRow
	translation: TranslationRow
}
