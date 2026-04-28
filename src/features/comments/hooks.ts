import { eq, useLiveQuery } from '@tanstack/react-db'

import type { UseLiveQueryResult, uuid } from '@/types/main'
import type { CommentPhraseLinkType, RequestCommentType } from './schemas'
import type { PhraseFullFullType } from '@/features/phrases/schemas'
import type { PhraseRequestType } from '@/features/requests/schemas'
import {
	commentPhraseLinksCollection,
	commentUpvotesCollection,
	commentsCollection,
} from './collections'
import { phrasesFull } from '@/features/phrases/live'
import { phraseRequestsCollection } from '@/features/requests/collections'

/** Look up a single comment by ID. Returns undefined when no id is given. */
export const useOneComment = (
	commentId: uuid | undefined
): UseLiveQueryResult<RequestCommentType> =>
	useLiveQuery(
		(q) =>
			!commentId
				? undefined
				: q
						.from({ comment: commentsCollection })
						.where(({ comment }) => eq(comment.id, commentId))
						.findOne(),
		[commentId]
	)

/** All phrases attached to a comment, hydrated through phrasesFull. */
export const usePhrasesFromComment = (
	commentId: uuid
): UseLiveQueryResult<
	{ phrase: PhraseFullFullType; link: CommentPhraseLinkType }[]
> =>
	useLiveQuery(
		(q) =>
			q
				.from({ link: commentPhraseLinksCollection })
				.where(({ link }) => eq(link.comment_id, commentId))
				.join(
					{ phrase: phrasesFull },
					({ link, phrase }) => eq(link.phrase_id, phrase.id),
					'inner'
				),
		[commentId]
	)

/** Whether the current user has upvoted this comment. */
export const useHasCommentUpvote = (commentId: uuid): boolean =>
	!!useLiveQuery(
		(q) =>
			q
				.from({ upvote: commentUpvotesCollection })
				.where(({ upvote }) => eq(upvote.comment_id, commentId)),
		[commentId]
	).data?.length

export function useAnyonesComments(
	uid: uuid,
	lang?: string
): UseLiveQueryResult<
	{ comment: RequestCommentType; request: PhraseRequestType }[]
> {
	return useLiveQuery(
		(q) => {
			let query = q
				.from({ comment: commentsCollection })
				.where(({ comment }) => eq(comment.uid, uid))
				.join(
					{ request: phraseRequestsCollection },
					({ comment, request }) => eq(comment.request_id, request.id),
					'inner'
				)
			if (lang) query = query.where(({ request }) => eq(request.lang, lang))

			return query.orderBy(({ comment }) => comment.created_at, 'desc')
		},
		[lang, uid]
	)
}
