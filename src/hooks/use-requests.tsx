import { eq, useLiveQuery } from '@tanstack/react-db'
import type { Tables } from '@/types/supabase'
import {
	friendSummariesCollection,
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

export function useMyFriendsRequestsLang(
	lang: string
): UseLiveQueryResult<PhraseRequestType[]> {
	return useLiveQuery((q) =>
		q
			.from({ request: phraseRequestsCollection })
			.where(({ request }) => eq(request.lang, lang))
			.join(
				{ friend: friendSummariesCollection },
				({ request, friend }) => eq(friend.uid, request.requester_uid),
				'inner'
			)
			.orderBy(({ request }) => request.created_at, 'desc')
			.select(({ request }) => ({ ...request }))
	)
}

// @@TODO obviously a placeholder
export const usePopularRequestsLang = useMyFriendsRequestsLang

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
