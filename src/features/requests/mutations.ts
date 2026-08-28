import { createOptimisticAction } from '@tanstack/db'

import supabase from '@/lib/supabase-client'
import { writeSyncedRow, writeSyncedRows } from '@/lib/collections/synced-row'
import type { uuid } from '@/types/main'
import {
	commentPhraseLinksCollection,
	commentsCollection,
	messageTagLinksCollection,
} from './collections'
import {
	CommentPhraseLinkSchema,
	type MessageTagLinkType,
	RequestCommentSchema,
} from './schemas'

/**
 * Which of these messages already carry this tag, keyed by message id.
 *
 * A detached link stays in the collection with `deleted` set, and a message
 * can hold both that row and a later replacement, so "does this message carry
 * this tag?" is a question about the live rows only. One pass over the
 * collection answers it for a whole selection.
 */
function liveTagLinksByMessage(messageIds: Array<uuid>, tagSlug: string) {
	const wanted = new Set(messageIds)
	const byMessage = new Map<uuid, MessageTagLinkType>()
	for (const link of messageTagLinksCollection.toArray) {
		if (
			!link.deleted &&
			link.tag_slug === tagSlug &&
			wanted.has(link.message_id)
		)
			byMessage.set(link.message_id, link)
	}
	return byMessage
}

/**
 * Attach a tag to these messages, in one transaction. Messages that already
 * carry it are left alone, and attaching to none of them returns nothing.
 */
export function attachMessageTag(messageIds: Array<uuid>, tagSlug: string) {
	const alreadyTagged = liveTagLinksByMessage(messageIds, tagSlug)
	const rows = messageIds
		.filter((messageId) => !alreadyTagged.has(messageId))
		.map((messageId) => ({
			id: crypto.randomUUID(),
			message_id: messageId,
			tag_slug: tagSlug,
			created_at: new Date().toISOString(),
			deleted: false,
		}))
	return rows.length ? messageTagLinksCollection.insert(rows) : undefined
}

/**
 * Detach a tag from these messages, in one transaction. Messages that don't
 * carry it are left alone, and detaching from none of them returns nothing.
 */
export function detachMessageTag(messageIds: Array<uuid>, tagSlug: string) {
	const linkIds = [...liveTagLinksByMessage(messageIds, tagSlug).values()].map(
		(link) => link.id
	)
	return linkIds.length
		? messageTagLinksCollection.update(linkIds, (drafts) => {
				for (const draft of drafts) draft.deleted = true
			})
		: undefined
}

/**
 * Removing a comment leaves a tombstone: the row stays in the thread as the
 * thing its replies are replying to, and `blank_removed_comment` clears the
 * text server-side. The phrase links go with it, so this is one optimistic
 * action across two collections rather than two `collection.update` calls that
 * could half succeed.
 */
export const deleteComment = createOptimisticAction<uuid>({
	onMutate: (commentId) => {
		commentsCollection.update(commentId, (draft) => {
			draft.deleted = true
			// Matches `blank_removed_comment`, so the text goes in the same tick
			// rather than when the server's row lands.
			draft.content = ''
		})
		const linkIds = commentPhraseLinksCollection.toArray
			.filter((link) => link.comment_id === commentId && !link.deleted)
			.map((link) => link.id)
		if (linkIds.length)
			commentPhraseLinksCollection.update(linkIds, (drafts) => {
				for (const draft of drafts) draft.deleted = true
			})
	},
	mutationFn: async (commentId) => {
		const { data } = await supabase
			.from('request_comment')
			.update({ deleted: true })
			.eq('id', commentId)
			.select()
			.throwOnError()
		const comment = data?.[0]
		if (!comment) {
			throw new Error(
				`Delete on request_comment ${commentId} affected no rows (permission denied or comment removed).`
			)
		}
		writeSyncedRow(commentsCollection, RequestCommentSchema.parse(comment))

		// `cascade_soft_delete_comment` flagged this comment's links; read them
		// back rather than assume which ones it touched. The SELECT policy still
		// shows the commenter their own flagged rows.
		const { data: links } = await supabase
			.from('comment_phrase_link')
			.select()
			.eq('comment_id', commentId)
			.throwOnError()
		writeSyncedRows(
			commentPhraseLinksCollection,
			links?.map((row) => CommentPhraseLinkSchema.parse(row)) ?? []
		)
	},
})
