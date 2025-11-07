import { and, eq, useLiveQuery } from '@tanstack/react-db'
import type { Tables } from '@/types/supabase'
import { useAuth } from '@/lib/hooks'
import {
	phraseRequestsCollection,
	publicProfilesCollection,
} from '@/lib/collections'
import { phrasesFull } from '@/lib/live-collections'

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
			.from({ phrase: phrasesFull })
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
	card: Tables<'user_card'> | null
}
