import { Link, useParams, useSearch } from '@tanstack/react-router'
import { MessagesSquare, Repeat, Send, WalletCards } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { SendRequestToFriendDialog } from '@/components/card-pieces/send-request-to-friend'
import { ShareRequestButton } from '@/components/card-pieces/share-request-button'
import CopyLinkButton from '@/components/copy-link-button'
import { buttonVariants } from '@/components/ui/button-variants'
import { AddCommentDialog } from '@/components/comments/add-comment-dialog'
import { DialogTrigger } from '@/components/ui/dialog'
import Flagged from '@/components/flagged'
import { useRequestCounts } from '@/hooks/use-requests'
import { UpvoteRequest } from './upvote-request-button'
import { PhraseRequestType } from '@/lib/schemas'

const showThread = { show: 'thread' } as const
const answersOnly = { show: 'answers-only' } as const

export function RequestButtonsRow({ request }: { request: PhraseRequestType }) {
	const counts = useRequestCounts(request.id)
	const currentUrlParams = useParams({ strict: false })
	const search = useSearch({ strict: false })
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
						<Button variant="ghost" size="icon" title="Repost this request">
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

				<div className="flex flex-row items-center gap-2">
					<AddCommentDialog requestId={request.id} lang={request.lang}>
						<DialogTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								title="Add a comment"
								data-testid="add-comment-trigger"
							>
								<MessagesSquare />
							</Button>
						</DialogTrigger>
					</AddCommentDialog>
					<span className="@max-sm:sr-only">
						{counts?.countComments ?? 0}
						<span className="@max-lg:sr-only">
							{' '}
							comment{counts?.countComments === 1 ? '' : 's'}
						</span>
					</span>
				</div>
				<div className="flex flex-row items-center gap-2">
					<Link
						to="/learn/$lang/requests/$id"
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						params={{ lang: request.lang, id: request.id }}
						title={`Click to view answers (${counts?.countLinks ?? 0})`}
						search={
							(
								search.show === 'answers-only' &&
								currentUrlParams.id === request.id
							) ?
								showThread
							:	answersOnly
						}
						className={buttonVariants({
							variant:
								search.show === 'answers-only' ? 'outline-primary' : 'ghost',
							size: 'icon',
						})}
					>
						<WalletCards />
					</Link>
					<span className="@max-sm:sr-only">
						{counts?.countLinks ?? 0}
						<span className="@max-lg:sr-only">
							{' '}
							answer{counts?.countLinks === 1 ? '' : 's'}
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
							title="Send this request to a friend"
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
