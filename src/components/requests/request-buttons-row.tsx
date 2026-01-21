import { useState } from 'react'
import { Link, useParams, useSearch } from '@tanstack/react-router'
import {
	Copy,
	MessagesSquare,
	MoreHorizontal,
	Repeat,
	Send,
	Share,
	WalletCards,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SendRequestToFriendDialog } from '@/components/card-pieces/send-request-to-friend'
import { AddCommentDialog } from '@/components/comments/add-comment-dialog'
import { DialogTrigger } from '@/components/ui/dialog'
import Flagged from '@/components/flagged'
import { useRequestCounts } from '@/hooks/use-requests'
import { UpvoteRequest } from './upvote-request-button'
import { PhraseRequestType } from '@/lib/schemas'
import { copyLink } from '@/lib/utils'
import { toastError } from '@/components/ui/sonner'
import languages from '@/lib/languages'

const showThread = { show: 'thread' } as const
const answersOnly = { show: 'answers-only' } as const

export function RequestButtonsRow({ request }: { request: PhraseRequestType }) {
	const counts = useRequestCounts(request.id)
	const currentUrlParams = useParams({ strict: false })
	const search = useSearch({ strict: false })
	const [sendDialogOpen, setSendDialogOpen] = useState(false)
	const [commentDialogOpen, setCommentDialogOpen] = useState(false)

	const url = `${window.location.origin}/learn/${request.lang}/requests/${request.id}`

	const handleShare = () => {
		if (!navigator.share) return
		navigator
			.share({
				title: `Sunlo: ${request.prompt}`,
				text: `Check out this request for a phrase in ${languages[request.lang]}: ${request.prompt}`,
				url,
			})
			.catch((error: DOMException) => {
				if (error.name !== 'AbortError') {
					toastError('Failed to share')
				}
			})
	}

	return (
		<>
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
						<Link
							to="/learn/$lang/requests/$id"
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

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							title="More actions"
							data-testid="request-more-actions"
						>
							<MoreHorizontal />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => setCommentDialogOpen(true)}>
							<MessagesSquare className="h-4 w-4" />
							Add comment
							{counts?.countComments ? ` (${counts.countComments})` : ''}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => copyLink(url)}>
							<Copy className="h-4 w-4" />
							Copy link
						</DropdownMenuItem>
						{'share' in navigator && (
							<DropdownMenuItem onClick={handleShare}>
								<Share className="h-4 w-4" />
								Share
							</DropdownMenuItem>
						)}
						<DropdownMenuItem onClick={() => setSendDialogOpen(true)}>
							<Send className="h-4 w-4" />
							Send to friend
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* Dialogs rendered outside dropdown to work properly */}
			<AddCommentDialog
				requestId={request.id}
				lang={request.lang}
				open={commentDialogOpen}
				onOpenChange={setCommentDialogOpen}
			>
				<DialogTrigger className="hidden" />
			</AddCommentDialog>

			<SendRequestToFriendDialog
				id={request.id}
				lang={request.lang}
				open={sendDialogOpen}
				onOpenChange={setSendDialogOpen}
			>
				<span className="hidden" />
			</SendRequestToFriendDialog>
		</>
	)
}
