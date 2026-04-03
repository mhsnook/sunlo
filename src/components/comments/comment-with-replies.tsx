import { Link, useSearch } from '@tanstack/react-router'
import { eq, useLiveQuery } from '@tanstack/react-db'
import { ChevronDown, ChevronUp, Edit, Reply } from 'lucide-react'

import type { UseLiveQueryResult, uuid } from '@/types/main'
import { UidPermalinkInline } from '@/components/card-pieces/user-permalink'
import { TinySelfAvatar } from '@/components/card-pieces/user-permalink'
import { Markdown } from '@/components/my-markdown'
import { CardResultSimple } from '@/components/cards/card-result-simple'
import {
	commentPhraseLinksCollection,
	commentsCollection,
} from '@/features/comments/collections'
import { publicProfilesCollection } from '@/features/profile/collections'
import { useUserId } from '@/lib/use-auth'
import {
	CommentPhraseLinkType,
	type RequestCommentType,
} from '@/features/comments/schemas'
import { PhraseFullFullType } from '@/features/phrases/schemas'
import { buttonVariants } from '@/components/ui/button'
import { phrasesFull } from '@/features/phrases/live'

import { DeleteCommentDialog } from './delete-comment-dialog'
import { Upvote } from './upvote-comment-button'
import { CommentContextMenu } from './comment-context-menu'
import { CSSProperties } from 'react'
import { Separator } from '../ui/separator'

interface CommentThreadProps {
	comment: RequestCommentType
	lang: string
}

export function CommentWithReplies({ comment, lang }: CommentThreadProps) {
	const userId = useUserId()
	const search = useSearch({ strict: false })

	// Get the child comments
	const { data: repliesData } = useLiveQuery(
		(q) =>
			q
				.from({ reply: commentsCollection })
				.where(({ reply }) => eq(reply.parent_comment_id, comment.id))
				.join({ profile: publicProfilesCollection }, ({ reply, profile }) =>
					eq(profile.uid, reply.uid)
				)
				.orderBy(({ reply }) => reply.created_at, 'asc'),
		[comment.id]
	)

	const replies = repliesData ?? []

	// focus=<uuid> (without a dialog mode) means highlight + expand
	const isFocusMode = search.focus && !search.mode
	const isFocused = search.focus === comment.id
	const isHighlighted = isFocusMode && isFocused
	const hasHighlightedReply =
		isFocusMode && replies.some(({ reply }) => reply.id === search.focus)
	// Show subthread when focused, even if a dialog is open over it
	const showSubthread = isHighlighted || hasHighlightedReply || isFocused

	const { data: phraseFromComment } = usePhrasesFromComment(comment.id)
	const phrases = phraseFromComment ?? []

	const isOwner = userId === comment.uid
	const replyCount = replies?.length ?? 0

	return (
		<div
			className={`${
				isHighlighted ? 'border-primary bg-card/50 rounded border border-s-2'
				: hasHighlightedReply ?
					'border-3-mlo-primary bg-card/50 rounded border border-s-2'
				:	''
			} p-4`}
			data-comment-id={comment.id}
			data-testid="comment-item"
			data-key={comment.id}
			style={
				{
					viewTransitionName: `comment-${comment.id}`,
				} as CSSProperties
			}
		>
			<div className="w-full">
				<div className="flex items-center justify-between">
					<UidPermalinkInline
						uid={comment.uid}
						timeValue={comment.created_at}
						action="commented"
						timeLinkParams={{ id: comment.request_id, lang }}
						timeLinkSearch={{ focus: comment.id }}
						timeLinkTo="/learn/$lang/requests/$id"
					/>

					<div className="flex gap-2">
						{isOwner && (
							<>
								<Link
									to="."
									search={(prev) => ({
										...prev,
										focus: comment.id,
										mode: 'edit' as const,
									})}
									className={buttonVariants({ variant: 'ghost', size: 'icon' })}
									aria-label="Edit comment"
									data-testid="edit-comment-button"
								>
									<Edit className="h-4 w-4" />
								</Link>
								<DeleteCommentDialog comment={comment} />
							</>
						)}
						<CommentContextMenu comment={comment} lang={lang} />
					</div>
				</div>

				{comment.content && (
					<div className="mt-2">
						<Markdown>{comment.content}</Markdown>
					</div>
				)}

				{phrases && phrases.length > 0 && (
					<div
						className="mt-3 space-y-2"
						data-testid="comment-phrase-link-badge"
					>
						{phrases.map(({ phrase }) => {
							return <CardResultSimple key={phrase.id} phrase={phrase} />
						})}
					</div>
				)}

				<div className="text-muted-foreground mt-3 flex items-center gap-4 text-sm">
					<Upvote comment={comment} />

					{replyCount === 0 && !showSubthread && (
						<Link
							className={buttonVariants({
								variant: 'ghost',
								size: 'sm',
							})}
							to={'.'}
							search={(search) => ({
								...search,
								focus: comment.id,
								mode: 'reply' as const,
							})}
							data-testid="reply-link"
						>
							<Reply className="me-1 h-4 w-4" />
							Reply
						</Link>
					)}

					{replyCount > 0 && (
						<Link
							className={buttonVariants({
								variant: showSubthread ? 'soft' : 'ghost',
								size: 'sm',
							})}
							to={'.'}
							search={(search) => {
								if (showSubthread) {
									const { focus: _, ...args } = search
									return args
								} else return { ...search, focus: comment.id }
							}}
						>
							{showSubthread ?
								<ChevronUp className="me-1 h-4 w-4" />
							:	<ChevronDown className="me-1 h-4 w-4" />}
							<span className="@max-md:sr-only">
								{showSubthread ? 'Showing' : `Show`}{' '}
							</span>
							{replyCount}
							{replyCount === 1 ? ' reply' : ' replies'}
						</Link>
					)}
				</div>

				{showSubthread && (
					<div className="mt-3 space-y-2 text-sm">
						<Separator />
						<Link
							to="."
							search={(prev) => ({
								...prev,
								focus: comment.id,
								mode: 'reply' as const,
							})}
							className="mt-2 flex grow cursor-pointer flex-row items-center gap-2 py-2"
							data-testid="add-reply-inline"
						>
							<TinySelfAvatar className="h-6 w-6 shrink-0" />
							<p className="bg-card/50 hover:bg-card/50 text-muted-foreground/70 w-full rounded-xl border px-2 py-1 pe-6 text-start text-xs shadow-xs inset-shadow-sm">
								Type your reply here...
							</p>
						</Link>
						{replies.length > 0 && (
							<div className="divide-y">
								{replies.map(({ reply }) => (
									<CommentReply key={reply.id} comment={reply} lang={lang} />
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	)
}

function usePhrasesFromComment(
	commentId: uuid
): UseLiveQueryResult<
	{ phrase: PhraseFullFullType; link: CommentPhraseLinkType }[]
> {
	return useLiveQuery(
		(q) =>
			q
				.from({ link: commentPhraseLinksCollection })
				.where(({ link }) => eq(link.comment_id, commentId))
				.join(
					{ phrase: phrasesFull },
					({ link, phrase }) => eq(link.phrase_id, phrase.id),
					'inner'
				),
		[commentId]
	)
}

function CommentReply({ comment, lang }: CommentThreadProps) {
	const { data: phraseFromComment } = usePhrasesFromComment(comment.id)
	const isHighlighted = useSearch({
		strict: false,
		select: (data) => data.focus === comment.id && !data.mode,
	})
	const userId = useUserId()
	const phrases = phraseFromComment ?? []

	const isOwner = userId === comment.uid

	return (
		<div
			className={`mt-2 py-2 ${isHighlighted ? 'border-primary -mx-2 rounded border border-s-2 px-2 py-1' : ''}`}
			data-testid="comment-reply"
		>
			<div className="flex items-center justify-between">
				<UidPermalinkInline
					uid={comment.uid}
					timeValue={comment.created_at}
					action="replied"
					timeLinkParams={{ id: comment.request_id, lang }}
					timeLinkSearch={{ focus: comment.id }}
					timeLinkTo="/learn/$lang/requests/$id"
				/>

				<div className="flex gap-1">
					{isOwner && (
						<>
							<Link
								to="."
								search={(prev) => ({
									...prev,
									focus: comment.id,
									mode: 'edit' as const,
								})}
								className={buttonVariants({ variant: 'ghost', size: 'icon' })}
								aria-label="Edit reply"
								data-testid="edit-reply-button"
							>
								<Edit className="h-3.5 w-3.5" />
							</Link>
							<DeleteCommentDialog comment={comment} />
						</>
					)}
					<CommentContextMenu comment={comment} lang={lang} />
				</div>
			</div>

			{comment.content && (
				<div className="ms-8 mt-1">
					<Markdown>{comment.content}</Markdown>
				</div>
			)}

			{phrases && phrases.length > 0 && (
				<div className="ms-8 mt-2 space-y-1.5">
					{phrases.map(({ phrase }) => (
						<CardResultSimple key={phrase.id} phrase={phrase} />
					))}
				</div>
			)}

			<div className="text-muted-foreground ms-8 mt-2 mb-1 flex items-center gap-2 pb-1">
				<Upvote comment={comment} />
			</div>
		</div>
	)
}
