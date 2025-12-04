import { and, eq, useLiveQuery } from '@tanstack/react-db'
import type { Tables } from '@/types/supabase'
import { useUserId } from '@/lib/use-auth'
import {
	phraseRequestsCollection,
	publicProfilesCollection,
} from '@/lib/collections'
import { phrasesFull } from '@/lib/live-collections'
import {
	PhraseFullFullType,
	PhraseRequestType,
	PublicProfileType,
} from '@/lib/schemas'
import { UseLiveQueryResult } from '@/types/main'

export function useAllMyPhraseRequestsLang(
	lang: string
): UseLiveQueryResult<PhraseRequestType[]> {
	const userId = useUserId()
	return useLiveQuery((q) =>
		q
			.from({ request: phraseRequestsCollection })
			.where(({ request }) =>
				and(eq(request.requester_uid, userId), eq(request.lang, lang))
			)
			.orderBy(({ request }) => request.created_at, 'desc')
	)
}

export function useRequestsLang(
	lang: string
): UseLiveQueryResult<PhraseRequestType[]> {
	return useLiveQuery((q) =>
		q
			.from({ request: phraseRequestsCollection })
			.where(({ request }) => eq(request.lang, lang))
			.orderBy(({ request }) => request.created_at, 'desc')
	)
}

export const useRequest = (
	id: string
): UseLiveQueryResult<
	PhraseRequestType & { profile: PublicProfileType | undefined }
> =>
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

export const usePhrasesFromRequest = (
	id: string
): UseLiveQueryResult<PhraseFullFullType[]> =>
	useLiveQuery((q) =>
		q
			.from({ phrase: phrasesFull })
			.where(({ phrase }) => eq(phrase.request_id, id))
	)

export type FulfillRequestResponse = {
	phrase: Tables<'phrase'>
	translation: Tables<'phrase_translation'>
	card: Tables<'user_card'> | null
}
