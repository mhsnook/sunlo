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

	// Toggle upvote mutation
	const toggleUpvoteMutation = useMutation({
		mutationFn: async () => {
			const { data, error } = await supabase.rpc('toggle_comment_upvote', {
				p_comment_id: comment.id,
			})
			if (error) throw error
			return data as {
				comment_id: uuid
				is_upvoted: boolean
				upvote_count: number
			}
		},
		onSuccess: (data) => {
			commentsCollection.utils.writeUpdate({
				id: data.comment_id,
				upvote_count: data.upvote_count ?? 0,
			})
			if (data.is_upvoted == true) {
				commentUpvotesCollection.utils.writeInsert({
					comment_id: data.comment_id,
				})
			} else if (data.is_upvoted == false) {
				commentUpvotesCollection.utils.writeDelete(data.comment_id)
			}
		},
		onError: (error: Error) => {
			toast.error(`Failed to toggle upvote: ${error.message}`)
		},
	})

	return (
		<Button
			variant={hasUpvoted ? 'outline' : 'outline'}
			size="sm"
			// oxlint-disable-next-line jsx-no-new-function-as-prop
			onClick={() => toggleUpvoteMutation.mutate()}
			disabled={toggleUpvoteMutation.isPending}
			className={hasUpvoted ? 'border-primary-foresoft/60' : ''}
		>
			<ThumbsUp
				className={
					hasUpvoted ? 'fill-primary-foresoft stroke-primary-foresoft/30' : ''
				}
			/>
			{comment.upvote_count}
		</Button>
	)
}
