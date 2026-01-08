import { useLiveQuery } from '@tanstack/react-db'
import { useMutation } from '@tanstack/react-query'
import { count, eq } from '@tanstack/db'
import toast from 'react-hot-toast'
import { ThumbsUp } from 'lucide-react'

import { commentsCollection, commentUpvotesCollection } from '@/lib/collections'
import supabase from '@/lib/supabase-client'
import type { uuid } from '@/types/main'
import { Button } from '@/components/ui/button'
import { RequestCommentType } from '@/lib/schemas'

export function Upvote({ comment }: { comment: RequestCommentType }) {
	const hasUpvoted = !!useLiveQuery(
		(q) =>
			q
				.from({ upvote: commentUpvotesCollection })
				.where(({ upvote }) => eq(upvote.comment_id, comment.id))
				.select(({ upvote }) => ({ total: count(upvote.comment_id) })),
		[comment.id]
	).data?.length

	// Upvote mutation with explicit action
	const upvoteMutation = useMutation({
		mutationFn: async (action: 'add' | 'remove') => {
			const { data, error } = await supabase.rpc('set_comment_upvote', {
				p_comment_id: comment.id,
				p_action: action,
			})
			if (error) throw error
			return data as {
				comment_id: uuid
				action: 'added' | 'removed' | 'no_change'
			}
		},
		onSuccess: (data) => {
			// Only update if server actually made a change
			if (data.action === 'no_change') return

			const currentCount = comment.upvote_count ?? 0
			const newCount =
				data.action === 'added' ?
					currentCount + 1
				:	Math.max(0, currentCount - 1)

			// Update the comment count
			commentsCollection.utils.writeUpdate({
				id: data.comment_id,
				upvote_count: newCount,
			})

			// Update the upvotes collection
			if (data.action === 'added') {
				commentUpvotesCollection.utils.writeInsert({
					comment_id: data.comment_id,
				})
			} else if (data.action === 'removed') {
				commentUpvotesCollection.utils.writeDelete(data.comment_id)
			}
		},
		onError: (error: Error) => {
			toast.error(`Failed to update upvote: ${error.message}`)
		},
	})

	return (
		<div className="flex flex-row items-center gap-2 text-sm">
			<Button
				variant={hasUpvoted ? 'outline-primary' : 'ghost'}
				title={hasUpvoted ? 'Remove vote' : 'Vote up this comment'}
				size="icon"
				// oxlint-disable-next-line jsx-no-new-function-as-prop
				onClick={(e) => {
					e.stopPropagation()
					// Send explicit action based on current state
					upvoteMutation.mutate(hasUpvoted ? 'remove' : 'add')
				}}
				disabled={upvoteMutation.isPending}
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
