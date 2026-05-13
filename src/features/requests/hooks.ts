import { eq, useLiveQuery } from '@tanstack/react-db'

import type { UseLiveQueryResult, uuid } from '@/types/main'
import {
	commentPhraseLinksCollection,
	commentsCollection,
} from '@/features/comments/collections'
import {
	phraseRequestsCollection,
	phraseRequestUpvotesCollection,
} from './collections'
import type { PhraseRequestType } from './schemas'

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

export const useRequestCounts = (
	id: uuid
): {
	countComments: number | undefined
	countLinks: number | undefined
} => {
	const countComments = useLiveQuery(
		(q) =>
			q
				.from({ comment: commentsCollection })
				.where(({ comment }) => eq(id, comment.request_id)),
		[id]
	).data?.length
	const countLinks = useRequestLinksPhraseIds(id).data?.length
	return {
		countComments,
		countLinks,
	}
}

export const useRequest = (
	id: uuid | undefined | null
): UseLiveQueryResult<PhraseRequestType> =>
	useLiveQuery(
		(q) =>
			!id
				? undefined
				: q
						.from({ req: phraseRequestsCollection })
						.where(({ req }) => eq(req.id, id))
						.findOne(),
		[id]
	)

export function useAnyonesPhraseRequests(
	uid: uuid,
	lang?: string
): UseLiveQueryResult<PhraseRequestType[]> {
	return useLiveQuery(
		(q) => {
			let query = q
				.from({ request: phraseRequestsCollection })
				.where(({ request }) => eq(request.requester_uid, uid))
			if (lang) query = query.where(({ request }) => eq(request.lang, lang))
			return query.orderBy(({ request }) => request.created_at, 'desc')
		},
		[lang, uid]
	)
}

/** Whether the current user has upvoted this request. */
export const useHasRequestUpvote = (requestId: uuid): boolean =>
	!!useLiveQuery(
		(q) =>
			q
				.from({ upvote: phraseRequestUpvotesCollection })
				.where(({ upvote }) => eq(upvote.request_id, requestId)),
		[requestId]
	).data?.length
