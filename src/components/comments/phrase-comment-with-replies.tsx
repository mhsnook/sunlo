import { CSSProperties } from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { eq, useLiveQuery } from '@tanstack/react-db'
import { ChevronDown, ChevronUp, Edit } from 'lucide-react'

import { UidPermalinkInline } from '@/components/card-pieces/user-permalink'
import { TinySelfAvatar } from '@/components/card-pieces/user-permalink'
import { Markdown } from '@/components/my-markdown'
import {
	commentTranslationLinksCollection,
	phraseCommentsCollection,
} from '@/features/comments/collections'
import { publicProfilesCollection } from '@/features/profile/collections'
import { useUserId } from '@/lib/use-auth'
import { type PhraseCommentType } from '@/features/comments/schemas'
import { buttonVariants } from '@/components/ui/button'
import { LangBadge } from '@/components/ui/badge'
import { usePhrase } from '@/hooks/composite-phrase'

import { DeletePhraseCommentDialog } from './delete-phrase-comment-dialog'
import { UpvotePhraseComment } from './upvote-phrase-comment-button'
import { Separator } from '../ui/separator'

interface PhraseCommentThreadProps {
	comment: PhraseCommentType
	lang: string
}

export function PhraseCommentWithReplies({
	comment,
	lang,
}: PhraseCommentThreadProps) {
	const userId = useUserId()
	const search = useSearch({ strict: false })

	// Get replies for this comment
	const { data: repliesData } = useLiveQuery(
		(q) =>
			q
				.from({ reply: phraseCommentsCollection })
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
	const isHighlighted = isFocusMode && search.focus === comment.id
	const hasHighlightedReply =
		isFocusMode && replies.some(({ reply }) => reply.id === search.focus)
	const showSubthread = isHighlighted || hasHighlightedReply

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
			data-testid="phrase-comment-item"
			data-key={comment.id}
			style={
				{
					viewTransitionName: `phrase-comment-${comment.id}`,
				} as CSSProperties
			}
		>
			<div className="w-full">
				<div className="flex items-center justify-between">
					<UidPermalinkInline
						uid={comment.uid}
						timeValue={comment.created_at}
						action="commented"
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
									data-testid="edit-phrase-comment-button"
								>
									<Edit className="h-4 w-4" />
								</Link>
								<DeletePhraseCommentDialog comment={comment} />
							</>
						)}
					</div>
				</div>

				{/* Comment content */}
				{comment.content && (
					<div className="mt-2">
						<Markdown>{comment.content}</Markdown>
					</div>
				)}

				{/* Attached translation */}
				<CommentTranslation comment={comment} />

				{/* Comment actions */}
				<div className="text-muted-foreground mt-3 flex items-center gap-4 text-sm">
					<UpvotePhraseComment comment={comment} />

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

				{/* Replies */}
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
							data-testid="add-phrase-reply-inline"
						>
							<TinySelfAvatar className="h-6 w-6 shrink-0" />
							<p className="bg-card/50 hover:bg-card/50 text-muted-foreground/70 w-full rounded-xl border px-2 py-1 pe-6 text-start text-xs shadow-xs inset-shadow-sm">
								Type your reply here...
							</p>
						</Link>
						{replies.length > 0 && (
							<div className="divide-y">
								{replies.map(({ reply }) => (
									<PhraseCommentReply
										key={reply.id}
										comment={reply}
										lang={lang}
									/>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	)
}

function CommentTranslation({ comment }: { comment: PhraseCommentType }) {
	// Get translation link for this comment (max 1)
	const { data: links } = useLiveQuery(
		(q) =>
			q
				.from({ link: commentTranslationLinksCollection })
				.where(({ link }) => eq(link.comment_id, comment.id)),
		[comment.id]
	)

	// Look up the phrase to get the translations array
	const { data: phrase } = usePhrase(comment.phrase_id)

	if (!links?.length || !phrase) return null

	// Resolve translation_id to actual translation
	const allTranslations = (phrase.translations_mine ?? []).concat(
		phrase.translations_other ?? []
	)
	const translation = allTranslations.find(
		(t) => t.id === links[0].translation_id
	)

	if (!translation) return null

	return (
		<div className="mt-3" data-testid="comment-translation-link">
			<div className="bg-muted flex items-baseline gap-2 rounded-lg p-2">
				<LangBadge lang={translation.lang} />
				<span className="text-sm">{translation.text}</span>
			</div>
		</div>
	)
}

function PhraseCommentReply({ comment }: PhraseCommentThreadProps) {
	const isHighlighted = useSearch({
		strict: false,
		select: (data) => data.focus === comment.id && !data.mode,
	})
	const userId = useUserId()
	const isOwner = userId === comment.uid

	return (
		<div
			className={`mt-2 py-2 ${isHighlighted ? 'border-primary -mx-2 rounded border border-s-2 px-2 py-1' : ''}`}
			data-testid="phrase-comment-reply"
		>
			<div className="flex items-center justify-between">
				<UidPermalinkInline
					uid={comment.uid}
					timeValue={comment.created_at}
					action="replied"
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
								data-testid="edit-phrase-reply-button"
							>
								<Edit className="h-3.5 w-3.5" />
							</Link>
							<DeletePhraseCommentDialog comment={comment} />
						</>
					)}
				</div>
			</div>

			{comment.content && (
				<div className="ms-8 mt-1">
					<Markdown>{comment.content}</Markdown>
				</div>
			)}

			{/* Attached translation */}
			<div className="ms-8">
				<CommentTranslation comment={comment} />
			</div>

			<div className="text-muted-foreground ms-8 mt-2 mb-1 flex items-center gap-2 pb-1">
				<UpvotePhraseComment comment={comment} />
			</div>
		</div>
	)
}
