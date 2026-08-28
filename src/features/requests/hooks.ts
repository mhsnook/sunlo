import { and, eq, isNull, useLiveQuery } from '@tanstack/react-db'
import { useMemo } from 'react'

import type { UseLiveQueryResult, uuid } from '@/types/main'
import {
	commentsCollection,
	commentUpvotesCollection,
	messageTagsCollection,
	phraseRequestsCollection,
	phraseRequestUpvotesCollection,
} from './collections'
import {
	commentPhraseLinksActive,
	commentsActive,
	messageTagLinksActive,
	phraseRequestsActive,
} from './live'
import type {
	CommentPhraseLinkType,
	CommentUpvoteType,
	MessageTagType,
	PhraseRequestType,
	PhraseRequestUpvoteType,
	RequestCommentType,
} from './schemas'

export const useRequestLinksPhraseIds = (
	requestId: uuid
): UseLiveQueryResult<{ phrase_id: uuid }[]> => {
	return useLiveQuery(
		(q) =>
			q
				.from({ link: commentPhraseLinksActive })
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
				.from({ comment: commentsActive })
				.where(({ comment }) => eq(id, comment.request_id)),
		[id]
	).data?.length
	const countLinks = useRequestLinksPhraseIds(id).data?.length
	return {
		countComments,
		countLinks,
	}
}

/**
 * A request's top-level comments, in the order the thread shows them.
 *
 * A removed comment is kept only while it is holding up a reply — with nothing
 * under it there is nothing to anchor, so it goes. `count` is the comments
 * proper: a tombstone is a place in the thread, not a comment.
 */
export const useRequestThread = (
	requestId: uuid
): { comments: Array<RequestCommentType>; count: number } => {
	const { data: threads } = useLiveQuery(
		(q) =>
			q
				.from({ comment: commentsCollection })
				.where(({ comment }) =>
					and(
						eq(comment.request_id, requestId),
						isNull(comment.parent_comment_id)
					)
				)
				.orderBy(({ comment }) => comment.upvote_count, 'desc'),
		[requestId]
	)
	const { data: replyParents } = useLiveQuery(
		(q) =>
			q
				.from({ reply: commentsActive })
				.where(({ reply }) => eq(reply.request_id, requestId))
				.select(({ reply }) => ({ parent_comment_id: reply.parent_comment_id }))
				.distinct(),
		[requestId]
	)

	return useMemo(() => {
		const withReplies = new Set(
			(replyParents ?? []).map((reply) => reply.parent_comment_id)
		)
		const comments: Array<RequestCommentType> = []
		let count = 0
		for (const comment of threads ?? []) {
			if (comment.deleted) {
				if (withReplies.has(comment.id)) comments.push(comment)
			} else {
				comments.push(comment)
				count++
			}
		}
		return { comments, count }
	}, [threads, replyParents])
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

/**
 * This user's upvote row for a request, upvoted or un-upvoted. Un-upvoting
 * flips `deleted` rather than removing the row, so a caller reads
 * `upvote?.deleted === false` for "has upvoted" and passes the row itself to
 * decide between an insert and an update.
 */
export const useMyRequestUpvote = (
	requestId: uuid
): PhraseRequestUpvoteType | undefined =>
	useLiveQuery(
		(q) =>
			q
				.from({ upvote: phraseRequestUpvotesCollection })
				.where(({ upvote }) => eq(upvote.request_id, requestId)),
		[requestId]
	).data?.[0]

/** Look up a single comment by ID. Returns undefined when no id is given. */
export const useOneComment = (
	commentId: uuid | undefined
): UseLiveQueryResult<RequestCommentType> =>
	useLiveQuery(
		(q) =>
			!commentId
				? undefined
				: q
						.from({ comment: commentsActive })
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
	commentId: uuid | undefined | null
): UseLiveQueryResult<CommentPhraseLinkType[]> =>
	useLiveQuery(
		(q) =>
			!commentId
				? undefined
				: q
						.from({ link: commentPhraseLinksActive })
						.where(({ link }) => eq(link.comment_id, commentId)),
		[commentId]
	)

/** This user's upvote row for a comment — see {@link useMyRequestUpvote}. */
export const useMyCommentUpvote = (
	commentId: uuid
): CommentUpvoteType | undefined =>
	useLiveQuery(
		(q) =>
			q
				.from({ upvote: commentUpvotesCollection })
				.where(({ upvote }) => eq(upvote.comment_id, commentId)),
		[commentId]
	).data?.[0]

/**
 * A "set" of phrases derived from a request tag: every phrase contributed as
 * an answer (`comment_phrase_link`) to any request whose message carries that
 * tag, for one language. These act like community-curated playlists assembled
 * by tagging requests rather than hand-building a playlist.
 */
export type RequestTagSet = {
	slug: string
	label: string
	description: string | null
	phraseIds: uuid[]
}

export function useRequestTagSets(lang: string): RequestTagSet[] {
	const { data: tags } = useMessageTags()
	const { data: tagLinks } = useLiveQuery(
		(q) => q.from({ link: messageTagLinksActive }),
		[]
	)
	const { data: requests } = useLiveQuery(
		(q) =>
			q
				.from({ request: phraseRequestsActive })
				.where(({ request }) => eq(request.lang, lang)),
		[lang]
	)
	const { data: phraseLinks } = useLiveQuery(
		(q) => q.from({ link: commentPhraseLinksActive }),
		[]
	)

	return useMemo(() => {
		if (!tags?.length || !requests?.length) return []

		// message_id → tag slugs attached to that message
		const slugsByMessage = new Map<uuid, string[]>()
		for (const link of tagLinks ?? []) {
			const list = slugsByMessage.get(link.message_id) ?? []
			list.push(link.tag_slug)
			slugsByMessage.set(link.message_id, list)
		}

		// request_id → message_id (this language's live requests only)
		const messageByRequest = new Map<uuid, uuid>()
		for (const request of requests) {
			if (request.message_id)
				messageByRequest.set(request.id, request.message_id)
		}

		// tag slug → distinct phrase ids contributed under that tag
		const phrasesBySlug = new Map<string, Set<uuid>>()
		for (const link of phraseLinks ?? []) {
			const messageId = messageByRequest.get(link.request_id)
			if (!messageId) continue
			const slugs = slugsByMessage.get(messageId)
			if (!slugs) continue
			for (const slug of slugs) {
				const set = phrasesBySlug.get(slug) ?? new Set<uuid>()
				set.add(link.phrase_id)
				phrasesBySlug.set(slug, set)
			}
		}

		return tags
			.map((tag) => ({
				slug: tag.slug,
				label: tag.label,
				description: tag.description,
				phraseIds: [...(phrasesBySlug.get(tag.slug) ?? [])],
			}))
			.filter((set) => set.phraseIds.length > 0)
			.toSorted((a, b) => b.phraseIds.length - a.phraseIds.length)
	}, [tags, tagLinks, requests, phraseLinks])
}

/** Requests for a language, grouped by the message tags on each request. */
export type RequestTagGroup = {
	slug: string
	label: string
	description: string | null
	requests: PhraseRequestType[]
}

export function useRequestsByMessageTag(lang: string): {
	groups: RequestTagGroup[]
	untagged: PhraseRequestType[]
} {
	const { data: tags } = useMessageTags()
	const { data: tagLinks } = useLiveQuery(
		(q) => q.from({ link: messageTagLinksActive }),
		[]
	)
	const { data: requests } = useLiveQuery(
		(q) =>
			q
				.from({ request: phraseRequestsActive })
				.where(({ request }) => eq(request.lang, lang))
				.orderBy(({ request }) => request.created_at, 'desc'),
		[lang]
	)

	return useMemo(() => {
		const reqs = requests ?? []
		if (!reqs.length) return { groups: [], untagged: [] }

		const slugsByMessage = new Map<uuid, string[]>()
		for (const link of tagLinks ?? []) {
			const list = slugsByMessage.get(link.message_id) ?? []
			list.push(link.tag_slug)
			slugsByMessage.set(link.message_id, list)
		}

		const bySlug = new Map<string, PhraseRequestType[]>()
		const untagged: PhraseRequestType[] = []
		for (const request of reqs) {
			const slugs = request.message_id
				? slugsByMessage.get(request.message_id)
				: undefined
			if (!slugs?.length) {
				untagged.push(request)
				continue
			}
			for (const slug of slugs) {
				const arr = bySlug.get(slug) ?? []
				arr.push(request)
				bySlug.set(slug, arr)
			}
		}

		const groups = (tags ?? [])
			.map((tag) => ({
				slug: tag.slug,
				label: tag.label,
				description: tag.description,
				requests: bySlug.get(tag.slug) ?? [],
			}))
			.filter((group) => group.requests.length > 0)

		return { groups, untagged }
	}, [tags, tagLinks, requests])
}

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
						.from({ link: messageTagLinksActive })
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
				.from({ comment: commentsActive })
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
