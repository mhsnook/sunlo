import { and, eq, useLiveQuery } from '@tanstack/react-db'
import { useMemo } from 'react'

import type { UseLiveQueryResult, uuid } from '@/types/main'
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
		(q) => q.from({ link: messageTagLinksCollection }),
		[]
	)
	const { data: requests } = useLiveQuery(
		(q) =>
			q
				.from({ request: phraseRequestsCollection })
				.where(({ request }) =>
					and(eq(request.lang, lang), eq(request.deleted, false))
				),
		[lang]
	)
	const { data: phraseLinks } = useLiveQuery(
		(q) => q.from({ link: commentPhraseLinksCollection }),
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
