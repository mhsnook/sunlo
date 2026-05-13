import { MessagesSquare, Repeat, Send, WalletCards } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { SendRequestToFriendDialog } from '@/components/card-pieces/send-request-to-friend'
import { ShareRequestButton } from '@/components/card-pieces/share-request-button'
import CopyLinkButton from '@/components/copy-link-button'
import Flagged from '@/components/flagged'
import { useRequestCounts } from '@/features/requests/hooks'
import { UpvoteRequest } from './upvote-request-button'
import { PhraseRequestType } from '@/features/requests/schemas'

export function RequestButtonsRow({ request }: { request: PhraseRequestType }) {
	const counts = useRequestCounts(request.id)
	const countComments = counts?.countComments ?? 0
	const countAnswers = counts?.countLinks ?? 0
	return (
		<div className="@container flex w-full flex-row items-center justify-between gap-2">
			<div className="text-muted-foreground flex flex-row items-center gap-4 text-sm font-normal @xl:gap-6">
				<UpvoteRequest request={request} />

				{/*
					We want a "repost" feature that allows you to do a sort of cross-post
					to another language. But we need to make a lot of decisions about how
					exactly that will work.
				*/}
				<Flagged>
					<div className="flex flex-row items-center gap-2">
						<Button
							variant="ghost"
							size="icon"
							aria-label="Repost this request"
						>
							<Repeat />
						</Button>
						<span className="@max-sm:sr-only">
							{/*counts?.countReposts ??*/ 0}
							<span className="sr-only">
								{' '}
								repost{counts?.countLinks === 1 ? '' : 's'}
							</span>
						</span>
					</div>
				</Flagged>

				<div
					className="flex flex-row items-center gap-2"
					data-testid="comments-count"
				>
					<MessagesSquare className="size-4" aria-hidden="true" />
					<span>
						{countComments}
						<span className="@max-lg:sr-only">
							{' '}
							comment{countComments === 1 ? '' : 's'}
						</span>
					</span>
				</div>
				<div
					className="flex flex-row items-center gap-2"
					data-testid="answers-count"
				>
					<WalletCards className="size-4" aria-hidden="true" />
					<span>
						{countAnswers}
						<span className="@max-lg:sr-only">
							{' '}
							answer{countAnswers === 1 ? '' : 's'}
						</span>
					</span>
				</div>
			</div>

			<div className="flex flex-row justify-between gap-4">
				<div className="flex flex-row items-center gap-2">
					<CopyLinkButton
						url={`${window.location.host}/learn/${request.lang}/requests/${request.id}`}
						variant="ghost"
						size="icon"
						text=""
					/>
					<ShareRequestButton
						id={request.id}
						lang={request.lang}
						variant="ghost"
						size="icon"
					/>
					<SendRequestToFriendDialog id={request.id} lang={request.lang}>
						<Button
							variant="ghost"
							size="icon"
							aria-label="Send this request to a friend"
							data-testid="send-to-friend-button"
						>
							<Send />
						</Button>
					</SendRequestToFriendDialog>
				</div>
			</div>
		</div>
	)
}
