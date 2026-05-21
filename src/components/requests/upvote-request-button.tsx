import { createOptimisticAction } from '@tanstack/db'
import type { MouseEvent } from 'react'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { ThumbsUp } from 'lucide-react'

import {
	phraseRequestsCollection,
	phraseRequestUpvotesCollection,
} from '@/features/requests/collections'
import { useHasRequestUpvote } from '@/features/requests/hooks'
import supabase from '@/lib/supabase-client'
import type { uuid } from '@/types/main'
import { Button } from '@/components/ui/button'
import { PhraseRequestType } from '@/features/requests/schemas'
import { useRequireAuth } from '@/hooks/use-require-auth'

type UpvoteInput = {
	requestId: uuid
	action: 'add' | 'remove'
	currentCount: number
}

const setRequestUpvote = createOptimisticAction<UpvoteInput>({
	onMutate: ({ requestId, action, currentCount }) => {
		const nextCount =
			action === 'add' ? currentCount + 1 : Math.max(0, currentCount - 1)
		phraseRequestsCollection.update(requestId, (draft) => {
			draft.upvote_count = nextCount
		})
		if (action === 'add') {
			phraseRequestUpvotesCollection.insert({ request_id: requestId })
		} else {
			phraseRequestUpvotesCollection.delete(requestId)
		}
	},
	mutationFn: async ({ requestId, action, currentCount }) => {
		const { error } = await supabase.rpc('set_phrase_request_upvote', {
			p_request_id: requestId,
			p_action: action,
		})
		if (error) throw error
		// Trust the optimistic ±1 count. Drifts by 1 in the 'no_change' edge
		// case (e.g. server already had us upvoted from another tab) and
		// self-corrects on next stale refetch. Avoids a full phrase_request
		// table refetch on every click.
		const nextCount =
			action === 'add' ? currentCount + 1 : Math.max(0, currentCount - 1)
		phraseRequestsCollection.utils.writeUpdate({
			id: requestId,
			upvote_count: nextCount,
		})
		if (action === 'add') {
			phraseRequestUpvotesCollection.utils.writeInsert({
				request_id: requestId,
			})
		} else {
			phraseRequestUpvotesCollection.utils.writeDelete(requestId)
		}
	},
})

export function UpvoteRequest({ request }: { request: PhraseRequestType }) {
	const requireAuth = useRequireAuth()
	const hasUpvoted = useHasRequestUpvote(request.id)

	const handleClick = (e: MouseEvent) => {
		e.stopPropagation()
		requireAuth(() => {
			const action: 'add' | 'remove' = hasUpvoted ? 'remove' : 'add'
			void Promise.all([
				phraseRequestsCollection.preload(),
				phraseRequestUpvotesCollection.preload(),
			]).then(() => {
				const tx = setRequestUpvote({
					requestId: request.id,
					action,
					currentCount: request.upvote_count ?? 0,
				})
				tx.isPersisted.promise.then(
					() => toastSuccess(action === 'add' ? 'Vote added!' : 'Vote removed'),
					(err: unknown) => {
						const message = err instanceof Error ? err.message : 'unknown error'
						toastError(`Failed to update upvote: ${message}`)
					}
				)
			})
		}, 'Please log in to vote on requests')
	}

	return (
		<div className="text-muted-foreground flex flex-row items-center gap-2 text-sm">
			<Button
				variant={hasUpvoted ? 'soft' : 'ghost'}
				title={hasUpvoted ? 'Remove vote' : 'Vote up this request'}
				size="icon"
				data-testid="upvote-request-button"
				onClick={handleClick}
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
