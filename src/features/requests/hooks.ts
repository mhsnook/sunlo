import { eq, useLiveQuery } from '@tanstack/react-db'

import type { UseLiveQueryResult, uuid } from '@/types/main'
import { looksLikeUuid } from '@/lib/public-id'
import {
	commentPhraseLinksCollection,
	commentUpvotesCollection,
	commentsCollection,
	messageTagLinksCollection,
	messageTagsCollection,
	phraseRequestsCollection,
	phraseRequestUpvotesCollection,
} from './collections'
import type {
	CommentPhraseLinkType,
	MessageTagType,
	PhraseRequestType,
	RequestCommentType,
} from './schemas'

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

// Resolves by public_id first (the canonical URL form) and falls back to the
// uuid so old bookmarks and foreign-key deep links keep working.
export const useRequest = (
	handle: string | undefined | null
): UseLiveQueryResult<PhraseRequestType> => {
	const byUuid = !!handle && looksLikeUuid(handle)
	return useLiveQuery(
		(q) =>
			!handle
				? undefined
				: q
						.from({ req: phraseRequestsCollection })
						.where(({ req }) =>
							byUuid ? eq(req.id, handle) : eq(req.public_id, handle)
						)
						.findOne(),
		[handle, byUuid]
	)
}

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

/**
 * Look up a single comment by public_id or uuid. Returns undefined when no
 * handle is given. The request thread's `?focus=` param is a comment public_id,
 * but in-app deep links that only carry the uuid (e.g. comment_phrase_link
 * rows) still resolve.
 */
export const useOneComment = (
	handle: uuid | undefined
): UseLiveQueryResult<RequestCommentType> => {
	const byUuid = !!handle && looksLikeUuid(handle)
	return useLiveQuery(
		(q) =>
			!handle
				? undefined
				: q
						.from({ comment: commentsCollection })
						.where(({ comment }) =>
							byUuid ? eq(comment.id, handle) : eq(comment.public_id, handle)
						)
						.findOne(),
		[handle, byUuid]
	)
}

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

/** All active (non-archived) message tags, ordered by sort_order. */
export const useMessageTags = () =>
	useLiveQuery(
		(q) =>
			q
				.from({ tag: messageTagsCollection })
				.where(({ tag }) => eq(tag.archived, false))
				.orderBy(({ tag }) => tag.sort_order, 'asc'),
		[]
	)

/** Active tags attached to a single message, ordered by sort_order. */
export const useMessageTagsForMessage = (
	messageId: uuid | undefined | null
): UseLiveQueryResult<MessageTagType[]> =>
	useLiveQuery(
		(q) =>
			!messageId
				? undefined
				: q
						.from({ link: messageTagLinksCollection })
						.where(({ link }) => eq(link.message_id, messageId))
						.join(
							{ tag: messageTagsCollection },
							({ link, tag }) => eq(link.tag_slug, tag.slug),
							'inner'
						)
						.where(({ tag }) => eq(tag.archived, false))
						.select(({ tag }) => tag)
						.orderBy(({ tag }) => tag.sort_order, 'asc'),
		[messageId]
	)

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
