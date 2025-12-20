import { useMemo } from 'react'
import { eq, useLiveQuery } from '@tanstack/react-db'

import type { Tables } from '@/types/supabase'
import type { UseLiveQueryResult, uuid } from '@/types/main'
import {
	commentPhraseLinksCollection,
	commentsCollection,
	friendSummariesCollection,
	phraseRequestsCollection,
	publicProfilesCollection,
} from '@/lib/collections'
import {
	CommentPhraseLinkType,
	PhraseRequestType,
	PublicProfileType,
} from '@/lib/schemas'
import { mapArrays } from '@/lib/utils'

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

export const useRequestLinksPhraseIds = (
	requestId: uuid
): UseLiveQueryResult<{ phrase_id: uuid }[]> => {
	return useLiveQuery(
		(q) =>
			q
				.from({ link: commentPhraseLinksCollection })
				.where(({ link }) => eq(link.request_id, requestId))
				.select(({ link }) => ({ phrase_id: link.phrase_id }))
				.distinct(),
		[requestId]
	)
}

export const useRequestLinksWithComments = (requestId: uuid) => {
	const { data, isLoading } = useLiveQuery((q) =>
		q
			.from({ link: commentPhraseLinksCollection })
			.where(({ link }) => eq(link.request_id, requestId))
			.join(
				{ comment: commentsCollection },
				({ link, comment }) => eq(link.comment_id, comment.id),
				'inner'
			)
			.select(({ link, comment }) => ({
				...link,
				parent_comment_id: comment.parent_comment_id,
			}))
	)
	return useMemo(() => {
		return {
			isLoading,
			data: mapArrays<
				CommentPhraseLinkType & { parent_comment_id: uuid | null },
				'phrase_id'
			>(data, 'phrase_id'),
		}
	}, [data, isLoading])
}

export const useRequestCounts = (
	id: uuid
): {
	countComments: number | undefined
	countLinks: number | undefined
} => {
	const countComments = useLiveQuery((q) =>
		q
			.from({ comment: commentsCollection })
			.where(({ comment }) => eq(id, comment.request_id))
	).data?.length
	const countLinks = useRequestLinksPhraseIds(id).data?.length
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

export type FulfillRequestResponse = {
	phrase: Tables<'phrase'>
	translation: Tables<'phrase_translation'>
	card: Tables<'user_card'> | null
}
