import type { MouseEvent } from 'react'
import { toastError } from '@/components/ui/sonner'
import { ThumbsUp } from 'lucide-react'

import { commentUpvotesCollection } from '@/features/requests/collections'
import { useMyCommentUpvote } from '@/features/requests/hooks'
import { Button } from '@/components/ui/button'
import { RequestCommentType } from '@/features/requests/schemas'
import { useRequireAuth } from '@/hooks/use-require-auth'

export function Upvote({ comment }: { comment: RequestCommentType }) {
	const requireAuth = useRequireAuth()
	const upvote = useMyCommentUpvote(comment.id)
	const hasUpvoted = upvote?.deleted === false

	const handleClick = (e: MouseEvent) => {
		e.stopPropagation()
		requireAuth(() => {
			// Un-upvoting flips `deleted` rather than removing the row, so the
			// collection mirrors the table.
			const tx = upvote
				? commentUpvotesCollection.update(comment.id, (draft) => {
						draft.deleted = !draft.deleted
					})
				: commentUpvotesCollection.insert({
						comment_id: comment.id,
						deleted: false,
					})
			tx.isPersisted.promise.catch((err: unknown) => {
				const message = err instanceof Error ? err.message : 'unknown error'
				toastError(`Failed to update upvote: ${message}`)
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
