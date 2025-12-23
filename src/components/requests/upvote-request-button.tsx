import { useLiveQuery } from '@tanstack/react-db'
import { useMutation } from '@tanstack/react-query'
import { count, eq } from '@tanstack/db'
import toast from 'react-hot-toast'
import { ThumbsUp } from 'lucide-react'

import {
	phraseRequestsCollection,
	phraseRequestUpvotesCollection,
} from '@/lib/collections'
import supabase from '@/lib/supabase-client'
import type { uuid } from '@/types/main'
import { Button } from '@/components/ui/button'
import { PhraseRequestType } from '@/lib/schemas'

export function UpvoteRequest({ request }: { request: PhraseRequestType }) {
	const hasUpvoted = !!useLiveQuery(
		(q) =>
			q
				.from({ upvote: phraseRequestUpvotesCollection })
				.where(({ upvote }) => eq(upvote.request_id, request.id))
				.select(({ upvote }) => ({ total: count(upvote.request_id) })),
		[request.id]
	).data?.length

	// Toggle upvote mutation
	const toggleUpvoteMutation = useMutation({
		mutationFn: async () => {
			const { data, error } = await supabase.rpc(
				'toggle_phrase_request_upvote',
				{
					p_request_id: request.id,
				}
			)
			if (error) throw error
			return data as {
				request_id: uuid
				action: 'added' | 'removed'
			}
		},
		onSuccess: (data) => {
			const currentCount = request.upvote_count ?? 0
			const newCount =
				data.action === 'added' ?
					currentCount + 1
				:	Math.max(0, currentCount - 1)

			phraseRequestsCollection.utils.writeUpdate({
				id: data.request_id,
				upvote_count: newCount,
			})
			if (data.action === 'added') {
				phraseRequestUpvotesCollection.utils.writeInsert({
					request_id: data.request_id,
				})
			} else {
				phraseRequestUpvotesCollection.utils.writeDelete(data.request_id)
			}
		},
		onError: (error: Error) => {
			toast.error(`Failed to toggle upvote: ${error.message}`)
		},
	})

	return (
		<div className="text-muted-foreground flex flex-row items-center gap-2 text-sm">
			<Button
				variant={hasUpvoted ? 'outline-primary' : 'ghost'}
				title={hasUpvoted ? 'Remove vote' : 'Vote up this request'}
				size="icon"
				data-testid="upvote-request-button"
				// oxlint-disable-next-line jsx-no-new-function-as-prop
				onClick={(e) => {
					e.stopPropagation()
					toggleUpvoteMutation.mutate()
				}}
				disabled={toggleUpvoteMutation.isPending}
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
