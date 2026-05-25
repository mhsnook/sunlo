import type { MouseEvent } from 'react'
import { ThumbsUp } from 'lucide-react'

import { commentUpvotesCollection } from '@/features/requests/collections'
import { useHasCommentUpvote } from '@/features/requests/hooks'
import { Button } from '@/components/ui/button'
import { RequestCommentType } from '@/features/requests/schemas'
import { useRequireAuth } from '@/hooks/use-require-auth'

export function Upvote({ comment }: { comment: RequestCommentType }) {
	const requireAuth = useRequireAuth()
	const hasUpvoted = useHasCommentUpvote(comment.id)

	const handleClick = (e: MouseEvent) => {
		e.stopPropagation()
		requireAuth(() => {
			void commentUpvotesCollection.preload().then(() => {
				if (hasUpvoted) {
					commentUpvotesCollection.delete(comment.id)
				} else {
					commentUpvotesCollection.insert({ comment_id: comment.id })
				}
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
