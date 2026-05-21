import { createOptimisticAction } from '@tanstack/db'
import type { MouseEvent } from 'react'
import { toastError } from '@/components/ui/sonner'
import { ThumbsUp } from 'lucide-react'

import {
	commentsCollection,
	commentUpvotesCollection,
} from '@/features/requests/collections'
import { useHasCommentUpvote } from '@/features/requests/hooks'
import supabase from '@/lib/supabase-client'
import type { uuid } from '@/types/main'
import { Button } from '@/components/ui/button'
import { RequestCommentType } from '@/features/requests/schemas'
import { useRequireAuth } from '@/hooks/use-require-auth'

type UpvoteInput = {
	commentId: uuid
	action: 'add' | 'remove'
	currentCount: number
}

const setCommentUpvote = createOptimisticAction<UpvoteInput>({
	onMutate: ({ commentId, action, currentCount }) => {
		const nextCount =
			action === 'add' ? currentCount + 1 : Math.max(0, currentCount - 1)
		commentsCollection.update(commentId, (draft) => {
			draft.upvote_count = nextCount
		})
		if (action === 'add') {
			commentUpvotesCollection.insert({ comment_id: commentId })
		} else {
			commentUpvotesCollection.delete(commentId)
		}
	},
	mutationFn: async ({ commentId, action, currentCount }) => {
		const { error } = await supabase.rpc('set_comment_upvote', {
			p_comment_id: commentId,
			p_action: action,
		})
		if (error) throw error
		// Trust the optimistic ±1 count. Drifts by 1 in the 'no_change' edge
		// case (e.g. server already had us upvoted from another tab) and
		// self-corrects on next stale refetch. Avoids a full request_comment
		// table refetch on every click.
		const nextCount =
			action === 'add' ? currentCount + 1 : Math.max(0, currentCount - 1)
		commentsCollection.utils.writeUpdate({
			id: commentId,
			upvote_count: nextCount,
		})
		if (action === 'add') {
			commentUpvotesCollection.utils.writeInsert({ comment_id: commentId })
		} else {
			commentUpvotesCollection.utils.writeDelete(commentId)
		}
	},
})

export function Upvote({ comment }: { comment: RequestCommentType }) {
	const requireAuth = useRequireAuth()
	const hasUpvoted = useHasCommentUpvote(comment.id)

	const handleClick = (e: MouseEvent) => {
		e.stopPropagation()
		requireAuth(() => {
			void Promise.all([
				commentsCollection.preload(),
				commentUpvotesCollection.preload(),
			]).then(() => {
				const tx = setCommentUpvote({
					commentId: comment.id,
					action: hasUpvoted ? 'remove' : 'add',
					currentCount: comment.upvote_count ?? 0,
				})
				tx.isPersisted.promise.catch((err: unknown) => {
					const message = err instanceof Error ? err.message : 'unknown error'
					toastError(`Failed to update upvote: ${message}`)
				})
			})
		}, 'Please log in to vote on comments')
	}

	return (
		<div className="flex flex-row items-center gap-2 text-sm">
			<Button
				variant={hasUpvoted ? 'soft' : 'ghost'}
				title={hasUpvoted ? 'Remove vote' : 'Vote up this comment'}
				size="icon"
				data-testid="upvote-comment-button"
				onClick={handleClick}
			>
				<ThumbsUp />
			</Button>
			<span>
				{comment.upvote_count}
				<span className="sr-only">
					{' '}
					vote{comment.upvote_count === 1 ? '' : 's'}
				</span>
			</span>
		</div>
	)
}
