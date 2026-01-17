import { createFileRoute, Link } from '@tanstack/react-router'
import { and, eq, isNull, useLiveQuery } from '@tanstack/react-db'
import * as z from 'zod'

import type { uuid } from '@/types/main'
import type { CommentPhraseLinkType } from '@/lib/schemas'
import { CardContent, CardFooter } from '@/components/ui/card'
import { Loader } from '@/components/ui/loader'
import { ShowAndLogError } from '@/components/errors'
import { useRequest } from '@/hooks/use-requests'
import { Markdown } from '@/components/my-markdown'
import { Badge } from '@/components/ui/badge'
import { CardlikeRequest } from '@/components/ui/card-like'
import { RequestHeader } from '@/components/requests/request-header'
import { AddCommentDialog } from '@/components/comments/add-comment-dialog'
import Flagged from '@/components/flagged'
import { Collapsible } from '@/components/ui/collapsible'
import languages from '@/lib/languages'
import { RequestButtonsRow } from '@/components/requests/request-buttons-row'
import { CardResultSimple } from '@/components/cards/card-result-simple'
import { WithPhrase } from '@/components/with-phrase'
import { CommentWithReplies } from '@/components/comments/comment-with-replies'
import {
	commentsCollection,
	commentPhraseLinksCollection,
} from '@/lib/collections'
import { mapArrays } from '@/lib/utils'
import { CSSProperties } from 'react'

export const Route = createFileRoute('/_user/learn/$lang/requests/$id')({
	validateSearch: z.object({
		show: z.enum(['thread', 'answers-only', 'request-only']).optional(),
		showSubthread: z.string().uuid().optional(),
		highlightComment: z.string().uuid().optional(),
	}),
	beforeLoad: ({ params: { lang } }) => ({
		titleBar: { title: `${languages[lang]} Request` },
		appnav: [],
	}),
	component: RequestThreadPage,
})

const style = { viewTransitionName: 'main-area' } as CSSProperties

export const useRequestLinksWithComments = (requestId: uuid) => {
	const { data, isLoading } = useLiveQuery((q) =>
		q
			.from({ link: commentPhraseLinksCollection })
			.where(({ link }) => eq(link.request_id, requestId))
			.join(
				{ comment: commentsCollection },
				({ link, comment }) => eq(link.comment_id, comment.id),
				'inner'
			)
			.select(({ link, comment }) => ({
				...link,
				parent_comment_id: comment.parent_comment_id,
			}))
	)
	return {
		isLoading,
		data: mapArrays<
			CommentPhraseLinkType & { parent_comment_id: uuid | null },
			'phrase_id'
		>(data, 'phrase_id'),
	}
}

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
		<main style={style}>
			<CardlikeRequest
				data-request-id={request.id}
				data-testid="request-permalink-card"
				style={{ viewTransitionName: `request-${request.id}` } as CSSProperties}
			>
				<RequestHeader request={request} />

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
					<RequestButtonsRow request={request} />
				</CardFooter>
			</CardlikeRequest>

			{/* Comment system */}
			<Collapsible open={search.show !== 'request-only'}>
				{search.show === 'answers-only' ?
					<AnswersOnlyView />
				:	<TopLevelComments requestId={params.id} lang={params.lang} />}
				<p className="text-muted-foreground mb-6 px-4 italic">
					This is the end of the thread.
				</p>
			</Collapsible>
		</main>
	)
}

const showThread = { show: 'thread' } as const

function AnswersOnlyView() {
	// Get all comment-phrase links for this request
	const params = Route.useParams()
	const { data: linksWithCommentsMap, isLoading } = useRequestLinksWithComments(
		params.id
	)
	if (isLoading) return <Loader />
	if (!linksWithCommentsMap) {
		console.log(
			`isLoading has completed but links is not linking`,
			linksWithCommentsMap
		)
		return null
	}

	const phraseIds = Object.keys(linksWithCommentsMap)

	return (
		<div className="my-4 space-y-3">
			<p className="text-muted-foreground text-sm">
				Showing {phraseIds.length} flashcard
				{phraseIds.length !== 1 ? 's' : ''} suggested.{' '}
				<Link to="." className="s-link" search={showThread}>
					Return to discussion.
				</Link>
			</p>
			<div className="grid divide-y border">
				{!phraseIds.length && (
					<div className="text-muted-foreground py-8 text-center">
						<p>No answers yet. Be the first to add one!</p>
					</div>
				)}
				{phraseIds.map((pid) => (
					<div key={pid} className="p-4 pb-2">
						<WithPhrase pid={pid} Component={CardResultSimple} />
						<p className="text-sm">
							View in thread:{' '}
							{linksWithCommentsMap[pid].map((l, i, arr) => (
								<span key={l.id}>
									{i > 0 && i < arr.length - 1 ? ',' : ''}
									{i === arr.length - 1 && arr.length > 1 ? ' and ' : ''}
									<Link
										to="."
										search={{
											show: 'thread',
											highlightComment: l.comment_id,
											showSubthread: l.parent_comment_id ?? l.comment_id,
										}}
										className="s-link text-sm"
									>
										here
									</Link>
								</span>
							))}
							.
						</p>
					</div>
				))}
			</div>
		</div>
	)
}

const answersOnly = { show: 'answers-only' } as const

function TopLevelComments({
	requestId,
	lang,
}: {
	requestId: uuid
	lang: string
}) {
	// Get comments for this request, sorted by upvote count
	const { data: comments, isLoading } = useLiveQuery(
		(q) =>
			q
				.from({ comment: commentsCollection })
				.where(({ comment }) =>
					and(
						eq(comment.request_id, requestId),
						isNull(comment.parent_comment_id)
					)
				)
				.orderBy(({ comment }) => comment.upvote_count, 'desc'),
		[requestId]
	)

	if (isLoading) return <Loader />

	return (
		<div className="my-4 space-y-3">
			<p className="text-muted-foreground text-sm">
				Showing {comments.length} comment
				{comments.length !== 1 ? 's' : ''}.{' '}
				<Link to="." className="s-link" search={answersOnly}>
					Show only proposed answers.
				</Link>
			</p>
			<div className="divide-y border">
				{comments.map((comment) => (
					<CommentWithReplies key={comment.id} comment={comment} lang={lang} />
				))}
				{!comments.length && (
					<div className="text-muted-foreground py-8 text-center">
						<p>No comments yet. Be the first to comment!</p>
					</div>
				)}
			</div>
		</div>
	)
}
