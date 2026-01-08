import { Link, useSearch } from '@tanstack/react-router'
import { eq, useLiveQuery } from '@tanstack/react-db'
import { ChevronDown, ChevronUp, MessagesSquare } from 'lucide-react'

import type { UseLiveQueryResult, uuid } from '@/types/main'
import { UidPermalinkInline } from '@/components/card-pieces/user-permalink'
import { Markdown } from '@/components/my-markdown'
import { CardResultSimple } from '@/components/cards/card-result-simple'
import {
	commentPhraseLinksCollection,
	commentsCollection,
	publicProfilesCollection,
} from '@/lib/collections'
import { useUserId } from '@/lib/use-auth'
import {
	CommentPhraseLinkType,
	PhraseFullFullType,
	type RequestCommentType,
} from '@/lib/schemas'
import { buttonVariants } from '@/components/ui/button-variants'
import { DialogTrigger } from '@/components/ui/dialog'
import { phrasesFull } from '@/lib/live-collections'

import { AddCommentDialog } from './add-comment-dialog'
import { DeleteCommentDialog } from './delete-comment-dialog'
import { UpdateCommentDialog } from './update-comment-dialog'
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

	// Get replies for this comment
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

	// Get phrases for this comment with a join
	const { data: phraseFromComment } = usePhrasesFromComment(comment.id)

	const phrases = phraseFromComment ?? []

	const isOwner = userId === comment.uid
	const replyCount = replies?.length ?? 0

	return (
		<div
			className={`${
				isHighlighted ?
					'bg-primary/30 ring-primary-foresoft/60 ring ring-offset-4'
				: showSubthread ? 'outline-primary rounded-lg outline'
				: ''
			} p-4`}
			data-comment-id={comment.id}
			data-testid="comment-item"
			style={
				// oxlint-disable-next-line jsx-no-new-object-as-prop
				{
					viewTransitionName: `comment-${comment.id}`,
				} as CSSProperties
			}
		>
			{/* Comment header */}
			<div className="w-full">
				<div className="flex items-center justify-between">
					<UidPermalinkInline
						uid={comment.uid}
						timeValue={comment.created_at}
						action="commented"
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						timeLinkParams={{ id: comment.request_id, lang }}
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						timeLinkSearch={{ showSubthread: comment.id }}
						timeLinkTo="/learn/$lang/requests/$id"
					/>

					<div className="flex gap-2">
						{isOwner && (
							<>
								<UpdateCommentDialog comment={comment} />
								<DeleteCommentDialog comment={comment} />
							</>
						)}
						<CommentContextMenu comment={comment} lang={lang} />
					</div>
				</div>

				{/* Comment content */}
				{comment.content && (
					<div className="mt-2">
						<Markdown>{comment.content}</Markdown>
					</div>
				)}

				{/* Attached flashcards */}
				{phrases && phrases.length > 0 && (
					<div className="mt-3 space-y-2">
						{phrases.map(({ phrase }) => {
							return <CardResultSimple key={phrase.id} phrase={phrase} />
						})}
					</div>
				)}

				{/* Comment actions */}
				<div className="text-muted-foreground mt-3 flex items-center gap-4 text-sm">
					<Upvote comment={comment} />
					<div className="flex items-center gap-2">
						<AddCommentDialog
							lang={lang}
							requestId={comment.request_id}
							parentCommentId={comment.id}
						>
							<DialogTrigger
								title="Add a reply"
								className={buttonVariants({ variant: 'ghost', size: 'icon' })}
							>
								<MessagesSquare />
							</DialogTrigger>
						</AddCommentDialog>{' '}
						<span>comment</span>
					</div>

					{replyCount > 0 && (
						<Link
							className={buttonVariants({
								variant: showSubthread ? 'outline-primary' : 'ghost',
								size: 'sm',
							})}
							to={'.'}
							// oxlint-disable-next-line jsx-no-new-function-as-prop
							search={(search) => {
								if (search.showSubthread === comment.id) {
									const { showSubthread: _, ...args } = search
									return args
								} else return { ...search, showSubthread: comment.id }
							}}
						>
							{showSubthread ?
								<ChevronUp className="mr-1 h-4 w-4" />
							:	<ChevronDown className="mr-1 h-4 w-4" />}
							<span className="@max-md:sr-only">
								{showSubthread ? 'Showing' : `Show`}{' '}
							</span>
							{replyCount}
							{replyCount === 1 ? ' reply' : ' replies'}
						</Link>
					)}
				</div>

				{/* Replies */}
				{showSubthread && replies && replies.length > 0 && (
					<div className="border-primary-foresoft/30 mt-3 space-y-3">
						<Separator />
						<div className="divide-y">
							{replies.map(({ reply }) => (
								<CommentReply key={reply.id} comment={reply} lang={lang} />
							))}
						</div>
						<AddCommentDialog
							parentCommentId={comment.id}
							requestId={comment.request_id}
							lang={lang}
						/>
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
			className={`mt-4 ${isHighlighted ? 'bg-primary/30 ring-primary-foresoft/60 ring ring-offset-4' : ''}`}
		>
			{/* Comment header */}
			<div className="flex items-center justify-between">
				<UidPermalinkInline
					uid={comment.uid}
					timeValue={comment.created_at}
					action="replied"
					// oxlint-disable-next-line jsx-no-new-object-as-prop
					timeLinkParams={{ id: comment.request_id, lang }}
					// oxlint-disable-next-line jsx-no-new-object-as-prop
					timeLinkSearch={{
						showSubthread: comment.parent_comment_id!,
						highlightComment: comment.id,
					}}
					timeLinkTo="/learn/$lang/requests/$id"
				/>

				<div className="flex gap-2">
					{isOwner && (
						<>
							<UpdateCommentDialog comment={comment} />
							<DeleteCommentDialog comment={comment} />
						</>
					)}
					<CommentContextMenu comment={comment} lang={lang} />
				</div>
			</div>

			{/* Comment content */}
			{comment.content && (
				<div className="ms-9 mt-2">
					<Markdown>{comment.content}</Markdown>
				</div>
			)}

			{/* Attached flashcards */}
			{phrases && phrases.length > 0 && (
				<div className="ms-9 mt-3 space-y-2">
					{phrases.map(({ phrase }) => (
						<CardResultSimple key={phrase.id} phrase={phrase} />
					))}
				</div>
			)}

			{/* Comment actions */}
			<div className="text-muted-foreground ms-9 mt-3 mb-2 flex items-center gap-2 pb-2">
				<Upvote comment={comment} />
			</div>
		</div>
	)
}
