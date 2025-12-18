import { eq, useLiveQuery } from '@tanstack/react-db'
import type { Tables } from '@/types/supabase'
import {
	commentPhraseLinksCollection,
	commentsCollection,
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
import { UseLiveQueryResult, uuid } from '@/types/main'
import { useMemo } from 'react'

export function useMyFriendsRequestsLang(
	lang: string
): UseLiveQueryResult<PhraseRequestType[]> {
	return useLiveQuery(
		(q) =>
			q
				.from({ request: phraseRequestsCollection })
				.where(({ request }) => eq(request.lang, lang))
				.join(
					{ friend: friendSummariesCollection },
					({ request, friend }) => eq(friend.uid, request.requester_uid),
					'inner'
				)
				.orderBy(({ request }) => request.created_at, 'desc')
				.select(({ request }) => ({ ...request })),
		[lang]
	)
}

// @@TODO obviously a placeholder
export const usePopularRequestsLang = useMyFriendsRequestsLang

export function useRequestsLang(
	lang: string
): UseLiveQueryResult<PhraseRequestType[]> {
	return useLiveQuery(
		(q) =>
			q
				.from({ request: phraseRequestsCollection })
				.where(({ request }) => eq(request.lang, lang))
				.orderBy(({ request }) => request.created_at, 'desc'),
		[lang]
	)
}

export const useRequestCounts = (
	id: uuid
): {
	countComments: number
	countLinks: number
} => {
	const countComments = useLiveQuery((q) =>
		q
			.from({ comment: commentsCollection })
			.where(({ comment }) => eq(id, comment.request_id))
	).data?.length
	const countLinks = useLiveQuery((q) =>
		q
			.from({ link: commentPhraseLinksCollection })
			.where(({ link }) => eq(id, link.request_id))
	).data?.length
	return useMemo(
		() => ({
			countComments,
			countLinks,
		}),
		[countComments, countLinks]
	)
}

export const useRequest = (
	id: uuid
): UseLiveQueryResult<PhraseRequestType & { profile: PublicProfileType }> =>
	useLiveQuery(
		(q) => {
			return q
				.from({ req: phraseRequestsCollection })
				.where(({ req }) => eq(req.id, id))
				.findOne()
				.join(
					{ profile: publicProfilesCollection },
					({ req, profile }) => eq(profile.uid, req.requester_uid),
					'inner'
				)
				.select(({ req, profile }) => ({
					...req,
					profile,
				}))
		},
		[id]
	)

// @@TODO THIS IS NOT WORKING ANY MORE DUE TO NEW DB STRUCTURE
export const usePhrasesFromRequest = (
	id: string
): UseLiveQueryResult<PhraseFullFullType[]> =>
	useLiveQuery(
		(q) =>
			q
				.from({ phrase: phrasesFull })
				.where(({ phrase }) => eq(phrase.request_id, id)),
		[id]
	)

export type FulfillRequestResponse = {
	phrase: Tables<'phrase'>
	translation: Tables<'phrase_translation'>
	card: Tables<'user_card'> | null
}
