import { eq, useLiveQuery } from '@tanstack/react-db'

import type { UseLiveQueryResult, uuid } from '@/types/main'
import type { CommentPhraseLinkType, RequestCommentType } from './schemas'
import type { PhraseRequestType } from '@/features/requests/schemas'
import {
	commentPhraseLinksCollection,
	commentUpvotesCollection,
	commentsCollection,
} from './collections'
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

/**
 * Comment-phrase-link rows for a single comment. Phrase hydration is the
 * caller's job — render each link's `phrase_id` through a per-row component
 * (e.g. `<WithPhrase pid={link.phrase_id} ... />`) so each phrase row owns
 * its own subscription. Keeps the cross-feature edge inside `phrases`.
 */
export const useCommentPhraseLinks = (
	commentId: uuid
): UseLiveQueryResult<CommentPhraseLinkType[]> =>
	useLiveQuery(
		(q) =>
			q
				.from({ link: commentPhraseLinksCollection })
				.where(({ link }) => eq(link.comment_id, commentId)),
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
