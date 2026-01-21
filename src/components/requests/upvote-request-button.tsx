import { useLiveQuery } from '@tanstack/react-db'
import { useMutation } from '@tanstack/react-query'
import { count, eq } from '@tanstack/db'
import { toastError } from '@/components/ui/error-toast'
import { ThumbsUp } from 'lucide-react'

import {
	phraseRequestsCollection,
	phraseRequestUpvotesCollection,
} from '@/lib/collections'
import supabase from '@/lib/supabase-client'
import type { uuid } from '@/types/main'
import { Button } from '@/components/ui/button'
import { PhraseRequestType } from '@/lib/schemas'
import { useRequireAuth } from '@/hooks/use-require-auth'

export function UpvoteRequest({ request }: { request: PhraseRequestType }) {
	const requireAuth = useRequireAuth()
	const hasUpvoted = !!useLiveQuery(
		(q) =>
			q
				.from({ upvote: phraseRequestUpvotesCollection })
				.where(({ upvote }) => eq(upvote.request_id, request.id))
				.select(({ upvote }) => ({ total: count(upvote.request_id) })),
		[request.id]
	).data?.length

	// Upvote mutation with explicit action
	const upvoteMutation = useMutation({
		mutationFn: async (action: 'add' | 'remove') => {
			const { data, error } = await supabase.rpc('set_phrase_request_upvote', {
				p_request_id: request.id,
				p_action: action,
			})
			if (error) throw error
			return data as {
				request_id: uuid
				action: 'added' | 'removed' | 'no_change'
			}
		},
		onSuccess: (data) => {
			// Only update if server actually made a change
			if (data.action === 'no_change') return

			const currentCount = request.upvote_count ?? 0
			const newCount =
				data.action === 'added' ?
					currentCount + 1
				:	Math.max(0, currentCount - 1)

			// Update the request count
			phraseRequestsCollection.utils.writeUpdate({
				id: data.request_id,
				upvote_count: newCount,
			})

			// Update the upvotes collection
			if (data.action === 'added') {
				phraseRequestUpvotesCollection.utils.writeInsert({
					request_id: data.request_id,
				})
			} else if (data.action === 'removed') {
				phraseRequestUpvotesCollection.utils.writeDelete(data.request_id)
			}
		},
		onError: (error: Error) => {
			toastError(`Failed to update upvote: ${error.message}`)
		},
	})

	return (
		<div className="text-muted-foreground flex flex-row items-center gap-2 text-sm">
			<Button
				variant={hasUpvoted ? 'outline-primary' : 'ghost'}
				title={hasUpvoted ? 'Remove vote' : 'Vote up this request'}
				size="icon"
				data-testid="upvote-request-button"
				onClick={(e) => {
					e.stopPropagation()
					requireAuth(() => {
						// Send explicit action based on current state
						upvoteMutation.mutate(hasUpvoted ? 'remove' : 'add')
					}, 'Please log in to vote on requests')
				}}
				disabled={upvoteMutation.isPending}
			>
				<ThumbsUp />
			</Button>
			<span className="font-medium @max-sm:sr-only">
				{request.upvote_count}{' '}
				<span className="sr-only">
					vote{request.upvote_count === 1 ? '' : 's'}
				</span>
			</span>
		</div>
	)
}
