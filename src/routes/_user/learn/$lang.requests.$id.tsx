import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as z from 'zod'
import { MessageSquareQuote, MessagesSquare } from 'lucide-react'

import { CardContent } from '@/components/ui/card'
import { Loader } from '@/components/ui/loader'
import { ShowAndLogError } from '@/components/errors'
import { Button } from '@/components/ui/button'
import { useRequest } from '@/hooks/use-requests'
import CopyLinkButton from '@/components/copy-link-button'
import { ShareRequestButton } from '@/components/card-pieces/share-request-button'
import { SendRequestToFriendDialog } from '@/components/card-pieces/send-request-to-friend'
import { Markdown } from '@/components/my-markdown'
import { Badge } from '@/components/ui/badge'
import { CardlikeRequest } from '@/components/ui/card-like'
import { RequestHeader } from '@/components/card-pieces/request-header-footer'
import { Collapsible } from '@radix-ui/react-collapsible'
import { AddCommentForm } from '@/components/comments/add-comment-form'
import { CommentList } from '@/components/comments/comment-list'
import { AnswersOnlyView } from '@/components/comments/answers-only-view'
import { Send } from 'lucide-react'
import Flagged from '@/components/flagged'
import { ButtonGroup } from '@/components/ui/button-group'

export const Route = createFileRoute('/_user/learn/$lang/requests/$id')({
	validateSearch: z.object({
		show: z.enum(['thread', 'answers-only', 'request-only']).optional(),
	}),
	component: FulfillRequestPage,
})

function FulfillRequestPage() {
	const params = Route.useParams()
	const navigate = useNavigate({ from: Route.fullPath })
	const { data: request, isLoading } = useRequest(params.id)
	const search = Route.useSearch()

	if (isLoading) return <Loader />

	if (!request)
		return (
			<ShowAndLogError
				error={new Error('Request not found')}
				message="We couldn't find that request. It might have been deleted or you may have mistyped the link."
			/>
		)

	return (
		<main>
			<CardlikeRequest>
				<RequestHeader profile={request.profile} request={request} />

				<CardContent className="flex flex-col gap-2">
					<Flagged>
						<div className="inline-flex flex-row gap-2">
							<Badge variant="outline">Food</Badge>
							<Badge variant="outline">Beginners</Badge>
						</div>
					</Flagged>
					<div className="text-lg">
						<Markdown>{request.prompt}</Markdown>
					</div>
					<div className="flex flex-row items-center justify-between">
						<p className="text-muted-foreground mt-4 text-sm">
							View comments and answers below
						</p>

						<div className="flex flex-row justify-between gap-4">
							<div className="flex flex-row items-center gap-2">
								<CopyLinkButton
									url={`${window.location.host}/learn/${params.lang}/requests/${params.id}`}
									variant="ghost"
									size="icon"
									text=""
								/>
								<ShareRequestButton
									id={params.id}
									lang={params.lang}
									variant="ghost"
									size="icon"
								/>
								<SendRequestToFriendDialog id={params.id} lang={params.lang}>
									<Button variant="ghost" size="icon">
										<Send />
									</Button>
								</SendRequestToFriendDialog>
							</div>
						</div>
					</div>

					<AddCommentForm requestId={params.id} lang={params.lang} />
				</CardContent>
			</CardlikeRequest>

			{/* View toggle buttons */}
			<ButtonGroup className="my-4">
				<Button
					variant={
						!search.show || search.show === 'thread' ? 'default' : 'outline'
					}
					size="sm"
					// oxlint-disable-next-line jsx-no-new-function-as-prop
					onClick={() => void navigate({ search: { show: 'thread' } })}
				>
					<MessagesSquare />
					Comments
				</Button>
				<Button
					variant={search.show === 'answers-only' ? 'default' : 'outline'}
					size="sm"
					// oxlint-disable-next-line jsx-no-new-function-as-prop
					onClick={() => void navigate({ search: { show: 'answers-only' } })}
				>
					<MessageSquareQuote />
					Answers Only
				</Button>
			</ButtonGroup>

			{/* Comment system */}
			<Collapsible open={search.show !== 'request-only'}>
				<div className="ms-4 border border-t-0 p-4">
					{search.show === 'answers-only' ?
						<AnswersOnlyView requestId={params.id} />
					:	<CommentList requestId={params.id} lang={params.lang} />}
				</div>
			</Collapsible>
		</main>
	)
}
