import { useLiveQuery } from '@tanstack/react-db'
import { useMutation } from '@tanstack/react-query'
import { count, eq } from '@tanstack/db'
import { toastError } from '@/components/ui/sonner'
import { ThumbsUp } from 'lucide-react'

import {
	commentPhraseLinksCollection,
	linkUpvotesCollection,
} from '@/features/comments/collections'
import supabase from '@/lib/supabase-client'
import type { uuid } from '@/types/main'
import { Button } from '@/components/ui/button'
import { CommentPhraseLinkType } from '@/features/comments/schemas'
import { useRequireAuth } from '@/hooks/use-require-auth'

export function UpvoteLink({ link }: { link: CommentPhraseLinkType }) {
	const requireAuth = useRequireAuth()
	const hasUpvoted = !!useLiveQuery(
		(q) =>
			q
				.from({ upvote: linkUpvotesCollection })
				.where(({ upvote }) => eq(upvote.link_id, link.id))
				.select(({ upvote }) => ({ total: count(upvote.link_id) })),
		[link.id]
	).data?.length

	const upvoteMutation = useMutation({
		mutationFn: async (action: 'add' | 'remove') => {
			const { data, error } = await supabase.rpc('set_link_upvote', {
				p_link_id: link.id,
				p_action: action,
			})
			if (error) throw error
			return data as {
				link_id: uuid
				action: 'added' | 'removed' | 'no_change'
			}
		},
		onSuccess: (data) => {
			if (data.action === 'no_change') return

			const currentCount = link.upvote_count ?? 0
			const newCount =
				data.action === 'added' ?
					currentCount + 1
				:	Math.max(0, currentCount - 1)

			commentPhraseLinksCollection.utils.writeUpdate({
				id: data.link_id,
				upvote_count: newCount,
			})

			if (data.action === 'added') {
				linkUpvotesCollection.utils.writeInsert({
					link_id: data.link_id,
				})
			} else if (data.action === 'removed') {
				linkUpvotesCollection.utils.writeDelete(data.link_id)
			}
		},
		onError: (error: Error) => {
			toastError(`Failed to update vote: ${error.message}`)
		},
	})

	return (
		<Button
			variant={hasUpvoted ? 'soft' : 'ghost'}
			title={hasUpvoted ? 'Remove vote' : 'Vote for this answer'}
			size="icon"
			className="h-7 w-7"
			data-testid="upvote-link-button"
			onClick={(e) => {
				e.stopPropagation()
				requireAuth(() => {
					upvoteMutation.mutate(hasUpvoted ? 'remove' : 'add')
				}, 'Please log in to vote on answers')
			}}
			disabled={upvoteMutation.isPending}
		>
			<ThumbsUp className="h-3.5 w-3.5" />
			{link.upvote_count > 0 && (
				<span className="text-xs">{link.upvote_count}</span>
			)}
			<span className="sr-only">
				{link.upvote_count} vote{link.upvote_count === 1 ? '' : 's'}
			</span>
		</Button>
	)
}
