import { Link, useParams, useSearch } from '@tanstack/react-router'
import { MessageSquareQuote, MessagesSquare, Repeat, Send } from 'lucide-react'

import type { uuid } from '@/types/main'
import { Button } from '@/components/ui/button'
import { SendRequestToFriendDialog } from '@/components/card-pieces/send-request-to-friend'
import { ShareRequestButton } from '@/components/card-pieces/share-request-button'
import CopyLinkButton from '@/components/copy-link-button'
import { buttonVariants } from '@/components/ui/button-variants'
import { AddCommentDialog } from '@/components/comments/add-comment-dialog'
import { DialogTrigger } from '@/components/ui/dialog'
import Flagged from '@/components/flagged'
import { useRequestCounts } from '@/hooks/use-requests'

const showThread = { show: 'thread' } as const
const answersOnly = { show: 'answers-only' } as const

export function RequestButtonsRow({
	requestId,
	lang,
}: {
	requestId: uuid
	lang: string
}) {
	const counts = useRequestCounts(requestId)
	const currentUrlParams = useParams({ strict: false })
	const search = useSearch({ strict: false })
	return (
		<div className="flex w-full flex-row items-center justify-between gap-2">
			<div className="text-muted-foreground flex flex-row items-center gap-8">
				<div>
					<Flagged className="space-x-2">
						<Button variant="ghost" size="icon" className="me-2">
							<Repeat />
						</Button>
						<span>0</span>
					</Flagged>
				</div>
				<div className="space-x-2">
					<AddCommentDialog requestId={requestId} lang={lang}>
						<DialogTrigger asChild>
							<Button variant="ghost" size="icon">
								<MessagesSquare />
							</Button>
						</DialogTrigger>
					</AddCommentDialog>
					<span>{counts?.countComments ?? 0}</span>
				</div>
				<div className="space-x-2">
					<Link
						to="/learn/$lang/requests/$id"
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						params={{ lang, id: requestId }}
						search={
							(
								search.show === 'answers-only' &&
								currentUrlParams.id === requestId
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
						<MessageSquareQuote />
					</Link>
					<span>{counts?.countLinks ?? 0}</span>
				</div>
			</div>

			<div className="flex flex-row justify-between gap-4">
				<div className="flex flex-row items-center gap-2">
					<CopyLinkButton
						url={`${window.location.host}/learn/${lang}/requests/${requestId}`}
						variant="ghost"
						size="icon"
						text=""
					/>
					<ShareRequestButton
						id={requestId}
						lang={lang}
						variant="ghost"
						size="icon"
					/>
					<SendRequestToFriendDialog id={requestId} lang={lang}>
						<Button variant="ghost" size="icon">
							<Send />
						</Button>
					</SendRequestToFriendDialog>
				</div>
			</div>
		</div>
	)
}
