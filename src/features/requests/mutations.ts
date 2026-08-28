import { createOptimisticAction } from '@tanstack/db'

import supabase from '@/lib/supabase-client'
import { writeSyncedRow, writeSyncedRows } from '@/lib/collections/synced-row'
import type { uuid } from '@/types/main'
import { commentPhraseLinksCollection, commentsCollection } from './collections'
import { CommentPhraseLinkSchema, RequestCommentSchema } from './schemas'

type DeleteCommentInput = {
	commentId: uuid
	/** The comment's own phrase links, from `useCommentPhraseLinks`. */
	linkIds: Array<uuid>
}

/**
 * Deleting a comment is a soft delete, and it has a cascade: the replies and
 * the phrase links go with it. Two collections change, so this is one
 * optimistic action rather than two `collection.update` calls that could half
 * succeed.
 *
 * The replies are other people's rows, which RLS will not let this client
 * update, so `cascade_soft_delete_comment` flags them on the server. They stay
 * unflagged in the local collection until the next fetch and never render:
 * a reply only mounts inside its parent, which leaves every live query as soon
 * as the flag lands.
 */
export const deleteComment = createOptimisticAction<DeleteCommentInput>({
	onMutate: ({ commentId, linkIds }) => {
		commentsCollection.update(commentId, (draft) => {
			draft.deleted = true
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

		// The trigger flagged this comment's links; read them back rather than
		// assume which ones it touched. The SELECT policy still shows the
		// commenter their own flagged rows.
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
