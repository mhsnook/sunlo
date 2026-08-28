import { createLiveQueryCollection, eq } from '@tanstack/db'
import {
	commentPhraseLinksCollection,
	commentsCollection,
	messageTagLinksCollection,
	phraseRequestsCollection,
} from './collections'

/**
 * Phrase requests with `deleted = false` pre-filtered.
 * Use this anywhere you want the "live" set of requests visible to users.
 */
export const phraseRequestsActive = createLiveQueryCollection({
	query: (q) =>
		q
			.from({ request: phraseRequestsCollection })
			.where(({ request }) => eq(request.deleted, false)),
})

/**
 * Comments with removed ones filtered out.
 *
 * A removed comment is a tombstone, not a hole — it keeps its place in the
 * thread so the replies under it still have a parent. So the thread renderer
 * reads `commentsCollection` directly and decides what to draw; everywhere
 * else, where a comment is only ever an item in a list, reads this.
 */
export const commentsActive = createLiveQueryCollection({
	query: (q) =>
		q
			.from({ comment: commentsCollection })
			.where(({ comment }) => eq(comment.deleted, false)),
})

/**
 * Comment-to-phrase links with `deleted = false` pre-filtered.
 * Use this anywhere you want the phrases a comment actually suggests.
 */
export const commentPhraseLinksActive = createLiveQueryCollection({
	query: (q) =>
		q
			.from({ link: commentPhraseLinksCollection })
			.where(({ link }) => eq(link.deleted, false)),
})

/**
 * Message-to-tag links with `deleted = false` pre-filtered.
 * Use this anywhere you want the tags a message actually carries.
 */
export const messageTagLinksActive = createLiveQueryCollection({
	query: (q) =>
		q
			.from({ link: messageTagLinksCollection })
			.where(({ link }) => eq(link.deleted, false)),
})
