import { queryOptions } from '@tanstack/react-query'
import supabase from '@/lib/supabase-client'
import { useAuth } from '@/lib/hooks'
import { PhraseRow, TranslationRow, uuid } from '@/types/main'
import { PublicProfile } from '@/routes/_user/friends/-types'
import { and, eq, useLiveQuery } from '@tanstack/react-db'
import {
	phraseRequestsCollection,
	phrasesCollection,
	publicProfilesCollection,
} from '@/lib/collections'

export const allMyPhraseRequestsQuery = (lang: string, userId: uuid) =>
	queryOptions({
		queryKey: ['user', 'phrase_requests', lang],
		queryFn: async ({ client }) => {
			const { data } = await supabase
				.from('meta_phrase_request')
				.select()
				.eq('requester_uid', userId)
				.eq('lang', lang)
				.order('created_at', { ascending: false })
				.throwOnError()

			// we're pulling this info anyway, we may as well cache it in the profiles cache
			if (data && data.length) {
				data.forEach((request) => {
					if (request.requester)
						client.setQueryData(
							[
								'public',
								'profile',
								() => (request.requester as PublicProfile).uid,
							],
							request.requester
						)
				})
			}

			return data
		},
	})

export function useAllMyPhraseRequestsLang(lang: string) {
	const { userId } = useAuth()
	return useLiveQuery((q) =>
		q
			.from({ request: phraseRequestsCollection })
			.where(({ request }) =>
				and(eq(request.requester_uid, userId), eq(request.lang, lang))
			)
	)
}

export const useRequest = (id: string) =>
	useLiveQuery((q) =>
		q
			.from({ req: phraseRequestsCollection })
			.where(({ req }) => eq(req.id, id))
			.findOne()
			.join({ profile: publicProfilesCollection }, ({ req, profile }) =>
				eq(profile.uid, req.requester_uid)
			)
			.select(({ req, profile }) => ({
				...req,
				profile,
			}))
	)

export const usePhrasesFromRequest = (id: string) =>
	useLiveQuery((q) =>
		q
			.from({ phrase: phrasesCollection })
			.where(({ phrase }) => eq(phrase.request_id, id))
			.join({ profile: publicProfilesCollection }, ({ phrase, profile }) =>
				eq(phrase.added_by, profile.uid)
			)
			.select(({ phrase, profile }) => ({
				...phrase,
				profile,
			}))
	)

export type FulfillRequestResponse = {
	phrase: PhraseRow
	translation: TranslationRow
}
