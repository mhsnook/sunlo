import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as z from 'zod'
import { MessageSquareQuote, MessagesSquare, Repeat } from 'lucide-react'

import { CardContent, CardFooter } from '@/components/ui/card'
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
import { AddCommentDialog } from '@/components/comments/add-comment-dialog'
import { AnswersOnlyView } from '@/components/comments/answers-only-view'
import { Send } from 'lucide-react'
import Flagged from '@/components/flagged'
import { ButtonGroup } from '@/components/ui/button-group'
import { TopLevelComments } from '@/components/comments/top-level-comments'
import { DialogTrigger } from '@/components/ui/dialog'

export const Route = createFileRoute('/_user/learn/$lang/requests/$id')({
	validateSearch: z.object({
		show: z.enum(['thread', 'answers-only', 'request-only']).optional(),
		showSubthread: z.string().uuid().optional(),
		highlightComment: z.string().uuid().optional(),
	}),
	component: RequestThreadPage,
})

function RequestThreadPage() {
	const params = Route.useParams()
	const navigate = useNavigate({ from: Route.fullPath })
	const { data: request, isLoading } = useRequest(params.id)
	const search = Route.useSearch()

	if (isLoading) return <Loader />

	if (!request)
		return (
			<ShowAndLogError
				error={new Error('Request not found')}
				text="We couldn't find that request. It might have been deleted or you may have mistyped the link."
			/>
		)

	return (
		<main>
			<CardlikeRequest>
				<RequestHeader profile={request.profile} request={request} />

				<CardContent className="flex flex-col gap-6">
					<Flagged>
						<div className="inline-flex flex-row gap-2">
							<Badge variant="outline">Food</Badge>
							<Badge variant="outline">Beginners</Badge>
						</div>
					</Flagged>
					<div className="text-lg">
						<Markdown>{request.prompt}</Markdown>
					</div>
				</CardContent>
				<CardFooter className="flex flex-col gap-2 border-t pt-6">
					<div className="flex w-full flex-row items-center justify-between gap-2">
						<div className="text-muted-foreground flex flex-row items-center gap-2">
							<Flagged>
								<Button variant="ghost" size="icon">
									<Repeat />
								</Button>
								<span>0</span>
							</Flagged>
							<AddCommentDialog requestId={params.id} lang={params.lang}>
								<DialogTrigger asChild>
									<Button variant="ghost" size="icon" className="ms-4">
										<MessagesSquare />
									</Button>
								</DialogTrigger>
							</AddCommentDialog>
							<span>0</span>
						</div>

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
					<AddCommentDialog requestId={params.id} lang={params.lang} />
				</CardFooter>
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
					:	<TopLevelComments requestId={params.id} lang={params.lang} />}
				</div>
			</Collapsible>
		</main>
	)
}
