import { createOptimisticAction } from '@tanstack/db'

import { toastError } from '@/components/ui/sonner'
import supabase from '@/lib/supabase-client'
import { writeSyncedRow, writeSyncedRows } from '@/lib/collections/synced-row'
import type { uuid } from '@/types/main'
import {
	commentPhraseLinksCollection,
	commentsCollection,
	messageTagLinksCollection,
} from './collections'
import { CommentPhraseLinkSchema, RequestCommentSchema } from './schemas'

/**
 * The live link between a message and a tag, if there is one. A detached link
 * stays in the collection with `deleted` set, and a message can hold both that
 * row and a later replacement, so "does this message carry this tag?" is a
 * question about the live rows only.
 */
const liveMessageTagLink = (messageId: uuid, tagSlug: string) =>
	messageTagLinksCollection.toArray.find(
		(link) =>
			link.message_id === messageId &&
			link.tag_slug === tagSlug &&
			!link.deleted
	)

/**
 * Attach a tag to a message. Attaching one it already carries does nothing.
 * Reports its own failure, because every caller says the same thing about one.
 */
export function attachMessageTag(messageId: uuid, tagSlug: string) {
	if (liveMessageTagLink(messageId, tagSlug)) return
	const tx = messageTagLinksCollection.insert({
		id: crypto.randomUUID(),
		message_id: messageId,
		tag_slug: tagSlug,
		created_at: new Date().toISOString(),
		deleted: false,
	})
	tx.isPersisted.promise.catch((err: unknown) => {
		toastError('Failed to add tag')
		console.error(err)
	})
	return tx
}

/** Detach a tag from a message. Detaching one it doesn't carry does nothing. */
export function detachMessageTag(messageId: uuid, tagSlug: string) {
	const link = liveMessageTagLink(messageId, tagSlug)
	if (!link) return
	const tx = messageTagLinksCollection.update(link.id, (draft) => {
		draft.deleted = true
	})
	tx.isPersisted.promise.catch((err: unknown) => {
		toastError('Failed to remove tag')
		console.error(err)
	})
	return tx
}

type DeleteCommentInput = {
	commentId: uuid
	/** The comment's own phrase links, from `useCommentPhraseLinks`. */
	linkIds: Array<uuid>
}

/**
 * Removing a comment leaves a tombstone: the row stays in the thread as the
 * thing its replies are replying to, and `blank_removed_comment` clears the
 * text server-side. The phrase links go with it, so this is one optimistic
 * action across two collections rather than two `collection.update` calls that
 * could half succeed.
 */
export const deleteComment = createOptimisticAction<DeleteCommentInput>({
	onMutate: ({ commentId, linkIds }) => {
		commentsCollection.update(commentId, (draft) => {
			draft.deleted = true
			// Matches `blank_removed_comment`, so the text goes in the same tick
			// rather than when the server's row lands.
			draft.content = ''
		})
		for (const linkId of linkIds) {
			commentPhraseLinksCollection.update(linkId, (draft) => {
				draft.deleted = true
			})
		}
	},
	mutationFn: async ({ commentId }) => {
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
