import type { MouseEvent } from 'react'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { ThumbsUp } from 'lucide-react'

import { phraseRequestUpvotesCollection } from '@/features/requests/collections'
import { useHasRequestUpvote } from '@/features/requests/hooks'
import { Button } from '@/components/ui/button'
import { PhraseRequestType } from '@/features/requests/schemas'
import { useRequireAuth } from '@/hooks/use-require-auth'

export function UpvoteRequest({ request }: { request: PhraseRequestType }) {
	const requireAuth = useRequireAuth()
	const hasUpvoted = useHasRequestUpvote(request.id)

	const handleClick = (e: MouseEvent) => {
		e.stopPropagation()
		requireAuth(() => {
			void phraseRequestUpvotesCollection.preload().then(() => {
				const tx = hasUpvoted
					? phraseRequestUpvotesCollection.delete(request.id)
					: phraseRequestUpvotesCollection.insert({ request_id: request.id })
				tx.isPersisted.promise.then(
					() => toastSuccess(hasUpvoted ? 'Vote removed' : 'Vote added!'),
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
