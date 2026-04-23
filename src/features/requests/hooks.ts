import { eq, useLiveQuery } from '@tanstack/react-db'

import type { Tables } from '@/types/supabase'
import type { UseLiveQueryResult, uuid } from '@/types/main'
import {
	commentPhraseLinksCollection,
	commentsCollection,
} from '@/features/comments/collections'
import {
	phraseRequestsCollection,
	phraseRequestUpvotesCollection,
} from './collections'
import type { CommentPhraseLinkType } from '@/features/comments/schemas'
import type { PhraseRequestType } from './schemas'
import { mapArrays } from '@/lib/utils'

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
	const { data, isLoading } = useLiveQuery(
		(q) =>
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
				})),
		[requestId]
	)
	return {
		isLoading,
		data: mapArrays<
			CommentPhraseLinkType & { parent_comment_id: uuid | null },
			'phrase_id'
		>(data, 'phrase_id'),
	}
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

/** Whether the current user has upvoted this request. */
export const useHasRequestUpvote = (requestId: uuid): boolean =>
	!!useLiveQuery(
		(q) =>
			q
				.from({ upvote: phraseRequestUpvotesCollection })
				.where(({ upvote }) => eq(upvote.request_id, requestId)),
		[requestId]
	).data?.length

export type FulfillRequestResponse = {
	phrase: Tables<'phrase'>
	translation: Tables<'phrase_translation'>
	card: Tables<'user_card'> | null
}
