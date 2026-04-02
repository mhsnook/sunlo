import { useLiveQuery } from '@tanstack/react-db'
import { useMutation } from '@tanstack/react-query'
import { count, eq } from '@tanstack/db'
import { toastError } from '@/components/ui/sonner'
import { ThumbsUp } from 'lucide-react'

import {
	phraseCommentsCollection,
	phraseCommentUpvotesCollection,
} from '@/features/comments/collections'
import supabase from '@/lib/supabase-client'
import type { uuid } from '@/types/main'
import { Button } from '@/components/ui/button'
import { PhraseCommentType } from '@/features/comments/schemas'
import { useRequireAuth } from '@/hooks/use-require-auth'

export function UpvotePhraseComment({
	comment,
}: {
	comment: PhraseCommentType
}) {
	const requireAuth = useRequireAuth()
	const hasUpvoted = !!useLiveQuery(
		(q) =>
			q
				.from({ upvote: phraseCommentUpvotesCollection })
				.where(({ upvote }) => eq(upvote.comment_id, comment.id))
				.select(({ upvote }) => ({ total: count(upvote.comment_id) })),
		[comment.id]
	).data?.length

	const upvoteMutation = useMutation({
		mutationFn: async (action: 'add' | 'remove') => {
			// @ts-expect-error -- RPC exists after migration; regenerate types with `pnpm run types`
			const { data, error } = await supabase.rpc('set_phrase_comment_upvote', {
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
			if (data.action === 'no_change') return

			const currentCount = comment.upvote_count ?? 0
			const newCount =
				data.action === 'added' ?
					currentCount + 1
				:	Math.max(0, currentCount - 1)

			phraseCommentsCollection.utils.writeUpdate({
				id: data.comment_id,
				upvote_count: newCount,
			})

			if (data.action === 'added') {
				phraseCommentUpvotesCollection.utils.writeInsert({
					comment_id: data.comment_id,
				})
			} else if (data.action === 'removed') {
				phraseCommentUpvotesCollection.utils.writeDelete(data.comment_id)
			}
		},
		onError: (error: Error) => {
			toastError(`Failed to update upvote: ${error.message}`)
		},
	})

	return (
		<div className="flex flex-row items-center gap-2 text-sm">
			<Button
				variant={hasUpvoted ? 'soft' : 'ghost'}
				title={hasUpvoted ? 'Remove vote' : 'Vote up this comment'}
				size="icon"
				data-testid="upvote-phrase-comment-button"
				onClick={(e) => {
					e.stopPropagation()
					requireAuth(() => {
						upvoteMutation.mutate(hasUpvoted ? 'remove' : 'add')
					}, 'Please log in to vote on comments')
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
