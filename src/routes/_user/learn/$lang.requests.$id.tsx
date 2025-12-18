import { createFileRoute, Link } from '@tanstack/react-router'
import * as z from 'zod'
import { MessageSquareQuote, MessagesSquare, Repeat } from 'lucide-react'

import { CardContent, CardFooter } from '@/components/ui/card'
import { Loader } from '@/components/ui/loader'
import { ShowAndLogError } from '@/components/errors'
import { Button } from '@/components/ui/button'
import { useRequest, useRequestCounts } from '@/hooks/use-requests'
import CopyLinkButton from '@/components/copy-link-button'
import { ShareRequestButton } from '@/components/card-pieces/share-request-button'
import { SendRequestToFriendDialog } from '@/components/card-pieces/send-request-to-friend'
import { Markdown } from '@/components/my-markdown'
import { Badge } from '@/components/ui/badge'
import { CardlikeRequest } from '@/components/ui/card-like'
import { RequestHeader } from '@/components/card-pieces/request-header-footer'
import { AddCommentDialog } from '@/components/comments/add-comment-dialog'
import { AnswersOnlyView } from '@/components/comments/answers-only-view'
import { Send } from 'lucide-react'
import Flagged from '@/components/flagged'
import { TopLevelComments } from '@/components/comments/top-level-comments'
import { Collapsible } from '@/components/ui/collapsible'
import languages from '@/lib/languages'
import { DialogTrigger } from '@/components/ui/dialog'
import { buttonVariants } from '@/components/ui/button-variants'

export const Route = createFileRoute('/_user/learn/$lang/requests/$id')({
	validateSearch: z.object({
		show: z.enum(['thread', 'answers-only', 'request-only']).optional(),
		showSubthread: z.string().uuid().optional(),
		highlightComment: z.string().uuid().optional(),
	}),
	loader: ({ params: { lang } }) => ({
		titleBar: { title: `${languages[lang]} Request` },
		appnav: [],
	}),
	component: RequestThreadPage,
})

const showThread = { show: 'thread' }
const answersOnly = { show: 'answers-only' }

function RequestThreadPage() {
	const params = Route.useParams()
	const { data: request, isLoading } = useRequest(params.id)
	const search = Route.useSearch()
	const counts = useRequestCounts(params.id)

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
				<CardFooter className="flex flex-col gap-4 border-t py-4">
					<AddCommentDialog requestId={params.id} lang={params.lang} />
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
								<AddCommentDialog requestId={params.id} lang={params.lang}>
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
									to="."
									search={
										search.show === 'answers-only' ? showThread : answersOnly
									}
									className={buttonVariants({
										variant:
											search.show === 'answers-only' ?
												'outline-primary'
											:	'ghost',
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
				</CardFooter>
			</CardlikeRequest>

			{/* Comment system */}
			<Collapsible open={search.show !== 'request-only'}>
				{search.show === 'answers-only' ?
					<AnswersOnlyView requestId={params.id} />
				:	<TopLevelComments requestId={params.id} lang={params.lang} />}
			</Collapsible>
		</main>
	)
}
