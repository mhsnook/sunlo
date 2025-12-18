import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'

import { CardContent, CardFooter } from '@/components/ui/card'
import { Loader } from '@/components/ui/loader'
import { ShowAndLogError } from '@/components/errors'

import { useRequest } from '@/hooks/use-requests'
import { Markdown } from '@/components/my-markdown'
import { Badge } from '@/components/ui/badge'
import { CardlikeRequest } from '@/components/ui/card-like'
import { RequestHeader } from '@/components/requests/request-header'
import { AddCommentDialog } from '@/components/comments/add-comment-dialog'
import { AnswersOnlyView } from '@/components/comments/answers-only-view'
import Flagged from '@/components/flagged'
import { TopLevelComments } from '@/components/comments/top-level-comments'
import { Collapsible } from '@/components/ui/collapsible'
import languages from '@/lib/languages'
import { RequestButtonsRow } from '@/components/requests/request-buttons-row'

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

function RequestThreadPage() {
	const params = Route.useParams()
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
				<CardFooter className="flex flex-col gap-4 border-t py-4">
					<AddCommentDialog requestId={params.id} lang={params.lang} />
					<RequestButtonsRow requestId={params.id} lang={params.lang} />
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
