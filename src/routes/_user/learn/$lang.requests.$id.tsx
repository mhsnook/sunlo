import { createFileRoute, Link } from '@tanstack/react-router'
import { and, eq, isNull, useLiveQuery } from '@tanstack/react-db'
import * as z from 'zod'
import { CSSProperties } from 'react'
import { Paperclip } from 'lucide-react'

import type { uuid } from '@/types/main'
import { CardContent, CardFooter } from '@/components/ui/card'
import { Loader } from '@/components/ui/loader'
import { ShowAndLogError } from '@/components/errors'
import {
	useRequest,
	useRequestLinksWithComments,
} from '@/features/requests/hooks'
import { Markdown } from '@/components/my-markdown'
import { Badge } from '@/components/ui/badge'
import { CardlikeRequest } from '@/components/ui/card-like'
import { RequestHeader } from '@/components/requests/request-header'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
	commentUpvotesCollection,
} from '@/features/comments/collections'
import { useOneComment } from '@/features/comments/hooks'
import { TinySelfAvatar } from '@/components/card-pieces/user-permalink'
import {
	CommentDialog,
	deriveCommentDialogMode,
} from '@/components/comments/comment-dialog'
import {
	ReplyDialog,
	deriveReplyDialogMode,
} from '@/components/comments/reply-dialog'
import { toastNeutral } from '@/components/ui/sonner'

export const Route = createFileRoute('/_user/learn/$lang/requests/$id')({
	validateSearch: z.object({
		show: z.enum(['thread', 'answers-only', 'request-only']).optional(),
		focus: z.string().uuid().optional().catch(undefined),
		mode: z.enum(['reply', 'edit', 'comment', 'search']).optional(),
		attaching: z.boolean().optional(),
	}),
	beforeLoad: ({ params: { lang } }) => ({
		titleBar: { title: `${languages[lang]} Request` },
		appnav: [],
	}),
	loader: async ({ context, location, cause }) => {
		const preloads: Promise<unknown>[] = [
			commentsCollection.preload(),
			commentPhraseLinksCollection.preload(),
		]
		if (context.auth.isAuth) {
			preloads.push(commentUpvotesCollection.preload())
		}
		await Promise.all(preloads)
		const rawFocus = new URLSearchParams(location.searchStr).get('focus')
		if (rawFocus && !z.string().uuid().safeParse(rawFocus).success) {
			if (cause === 'preload')
				console.error('Malformed focus param in preload link:', rawFocus)
			else toastNeutral("Couldn't find that comment")
		}
	},
	component: RequestThreadPage,
})

const style = { viewTransitionName: 'main-area' } as CSSProperties

function RequestThreadPage() {
	const params = Route.useParams()
	const { data: request, isLoading } = useRequest(params.id)
	const search = Route.useSearch()

	// Look up the comment being edited/focused (if any) for both dialogs
	const editingId =
		search.mode === 'edit' || search.mode === 'reply' ? search.focus : undefined
	const { data: editComment } = useOneComment(editingId)

	// Derive dialog modes from URL
	const commentMode = deriveCommentDialogMode(search)
	const replyMode = deriveReplyDialogMode(search, editComment ?? undefined)

	// If editing a reply, the CommentDialog shouldn't also open
	const effectiveCommentMode =
		replyMode && search.mode === 'edit' ? undefined : commentMode

	if (isLoading) return <Loader />

	if (!request)
		return (
			<ShowAndLogError
				error={new Error('Request not found')}
				text="We couldn't find that request. It might have been deleted or you may have mistyped the link."
			/>
		)

	return (
		<main style={style} data-testid="request-detail-page">
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
					<div className="flex w-full flex-row items-center gap-2">
						<Link
							to="."
							search={(s) => ({ ...s, mode: 'comment' })}
							className="@group flex grow cursor-pointer flex-row items-center gap-2"
							data-testid="open-comment-dialog"
						>
							<TinySelfAvatar className="grow-o shrink-0" />
							<p className="bg-card/50 hover:bg-card/50 text-muted-foreground/70 w-full rounded-xl border px-2 py-1.5 pe-6 text-start text-sm shadow-xs inset-shadow-sm">
								Add a comment or suggest a card...
							</p>
						</Link>
						<Link
							to="."
							search={(s) => ({ ...s, mode: 'search' })}
							className={cn(
								buttonVariants({ variant: 'soft', size: 'sm' }),
								'shrink-0 border border-transparent'
							)}
							data-testid="open-flashcard-search"
						>
							<Paperclip className="h-4 w-4" />
							Flashcard
						</Link>
					</div>
					<RequestButtonsRow request={request} />
				</CardFooter>
			</CardlikeRequest>

			<CommentDialog
				requestId={params.id}
				lang={params.lang}
				mode={effectiveCommentMode}
				editComment={editComment ?? undefined}
			/>

			<ReplyDialog requestId={params.id} lang={params.lang} mode={replyMode} />

			{/* Comment system */}
			<Collapsible open={search.show !== 'request-only'}>
				{search.show === 'answers-only' ? (
					<AnswersOnlyView />
				) : (
					<TopLevelComments requestId={params.id} lang={params.lang} />
				)}
			</Collapsible>
		</main>
	)
}

const showThread = { show: 'thread' } as const

function AnswersOnlyView() {
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
		<>
			<div className="my-4 space-y-3">
				<p className="text-muted-foreground px-4 text-sm">
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
												focus: l.comment_id,
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
			{phraseIds.length ? (
				<p className="text-muted-foreground mb-6 px-4 text-xs italic">
					This is the end of the thread.
				</p>
			) : null}
		</>
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
		<>
			<div className="my-4 space-y-3">
				<p className="text-muted-foreground px-4 text-sm">
					Showing {comments.length} comment
					{comments.length !== 1 ? 's' : ''}.{' '}
					<Link to="." className="s-link" search={answersOnly}>
						Show only proposed answers.
					</Link>
				</p>
				<div className="divide-y border">
					{comments.map((comment) => (
						<CommentWithReplies
							key={comment.id}
							comment={comment}
							lang={lang}
						/>
					))}
					{!comments.length && (
						<div className="text-muted-foreground py-8 text-center">
							<p>No comments yet. Be the first to comment!</p>
						</div>
					)}
				</div>
			</div>
			{comments.length ? (
				<p className="text-muted-foreground mb-6 px-4 text-xs italic">
					This is the end of the thread.
				</p>
			) : null}
		</>
	)
}
