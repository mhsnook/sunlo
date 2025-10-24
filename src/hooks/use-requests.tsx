import { useAuth } from '@/lib/hooks'
import { and, eq, useLiveQuery } from '@tanstack/react-db'
import {
	phraseRequestsCollection,
	phrasesCollection,
	publicProfilesCollection,
} from '@/lib/collections'
import { Tables } from '@/types/supabase'

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
	phrase: Tables<'phrase'>
	translation: Tables<'phrase_translation'>
}
