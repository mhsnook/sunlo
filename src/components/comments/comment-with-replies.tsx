import { Link, useSearch } from '@tanstack/react-router'
import { eq, useLiveQuery } from '@tanstack/react-db'
import { ChevronDown, ChevronUp, Edit, MessagesSquare } from 'lucide-react'

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
	const showSubthread = search.showSubthread === comment.id
	const isHighlighted = useSearch({
		strict: false,
		select: (data) => data.highlightComment === comment.id,
	})

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

	const { data: phraseFromComment } = usePhrasesFromComment(comment.id)
	const phrases = phraseFromComment ?? []

	const isOwner = userId === comment.uid
	const replyCount = replies?.length ?? 0

	return (
		<div
			className={`${
				isHighlighted ?
					'bg-2-mid-primary ring-primary-foresoft/60 ring ring-offset-4'
				: showSubthread ? 'outline-primary rounded-lg outline'
				: ''
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
						timeLinkSearch={{ showSubthread: comment.id }}
						timeLinkTo="/learn/$lang/requests/$id"
					/>

					<div className="flex gap-2">
						{isOwner && (
							<>
								<Link
									to="."
									search={(prev: Record<string, unknown>) => ({
										...prev,
										editing: comment.id,
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
					<div className="flex items-center gap-2">
						<Link
							to="."
							search={(prev: Record<string, unknown>) => ({
								...prev,
								replying: comment.id,
							})}
							className={buttonVariants({ variant: 'ghost', size: 'icon' })}
							aria-label="Add a reply"
							data-testid="reply-to-comment-button"
						>
							<MessagesSquare />
						</Link>
						<span>reply</span>
					</div>

					{replyCount > 0 && (
						<Link
							className={buttonVariants({
								variant: showSubthread ? 'soft' : 'ghost',
								size: 'sm',
							})}
							to={'.'}
							search={(search) => {
								if (search.showSubthread === comment.id) {
									const { showSubthread: _, ...args } = search
									return args
								} else return { ...search, showSubthread: comment.id }
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

				{showSubthread && replies && replies.length > 0 && (
					<div className="border-3-mlo-primary mt-3 space-y-3">
						<Separator />
						<div className="divide-y">
							{replies.map(({ reply }) => (
								<CommentReply key={reply.id} comment={reply} lang={lang} />
							))}
						</div>
						<Link
							to="."
							search={(prev: Record<string, unknown>) => ({
								...prev,
								replying: comment.id,
							})}
							className="@group flex grow cursor-pointer flex-row items-center gap-2"
							data-testid="add-reply-inline"
						>
							<TinySelfAvatar className="grow-o shrink-0" />
							<p className="bg-card/50 hover:bg-card/50 text-muted-foreground/70 w-full rounded-xl border px-2 py-1.5 pe-6 text-start text-sm shadow-xs inset-shadow-sm">
								Type your reply here...
							</p>
						</Link>
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
		select: (data) => data.highlightComment === comment.id,
	})
	const userId = useUserId()
	const phrases = phraseFromComment ?? []

	const isOwner = userId === comment.uid

	return (
		<div
			className={`mt-4 ${isHighlighted ? 'border-s-primary rounded border-s-2 ps-3' : ''}`}
			data-testid="comment-reply"
		>
			<div className="flex items-center justify-between">
				<UidPermalinkInline
					uid={comment.uid}
					timeValue={comment.created_at}
					action="replied"
					timeLinkParams={{ id: comment.request_id, lang }}
					timeLinkSearch={{
						showSubthread: comment.parent_comment_id!,
						highlightComment: comment.id,
					}}
					timeLinkTo="/learn/$lang/requests/$id"
				/>

				<div className="flex gap-2">
					{isOwner && (
						<>
							<Link
								to="."
								search={(prev: Record<string, unknown>) => ({
									...prev,
									editing: comment.id,
								})}
								className={buttonVariants({ variant: 'ghost', size: 'icon' })}
								aria-label="Edit reply"
								data-testid="edit-reply-button"
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
				<div className="ms-9 mt-2">
					<Markdown>{comment.content}</Markdown>
				</div>
			)}

			{phrases && phrases.length > 0 && (
				<div className="ms-9 mt-3 space-y-2">
					{phrases.map(({ phrase }) => (
						<CardResultSimple key={phrase.id} phrase={phrase} />
					))}
				</div>
			)}

			<div className="text-muted-foreground ms-9 mt-3 mb-2 flex items-center gap-2 pb-2">
				<Upvote comment={comment} />
			</div>
		</div>
	)
}
