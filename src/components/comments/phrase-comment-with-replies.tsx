import { useSearch } from '@tanstack/react-router'
import { eq, useLiveQuery } from '@tanstack/react-db'
import { ChevronDown, ChevronUp, MessagesSquare } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { UidPermalinkInline } from '@/components/card-pieces/user-permalink'
import { Markdown } from '@/components/my-markdown'
import {
	commentTranslationLinksCollection,
	phraseCommentsCollection,
} from '@/features/comments/collections'
import { publicProfilesCollection } from '@/features/profile/collections'
import { type PhraseCommentType } from '@/features/comments/schemas'
import { buttonVariants } from '@/components/ui/button'
import { DialogTrigger } from '@/components/ui/dialog'
import { LangBadge } from '@/components/ui/badge'
import { usePhrase } from '@/hooks/composite-phrase'

import { AddPhraseCommentDialog } from './add-phrase-comment-dialog'
import { UpvotePhraseComment } from './upvote-phrase-comment-button'
import { CSSProperties } from 'react'
import { Separator } from '../ui/separator'

interface PhraseCommentThreadProps {
	comment: PhraseCommentType
	lang: string
}

export function PhraseCommentWithReplies({
	comment,
	lang,
}: PhraseCommentThreadProps) {
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
				.from({ reply: phraseCommentsCollection })
				.where(({ reply }) => eq(reply.parent_comment_id, comment.id))
				.join({ profile: publicProfilesCollection }, ({ reply, profile }) =>
					eq(profile.uid, reply.uid)
				)
				.orderBy(({ reply }) => reply.created_at, 'asc'),
		[comment.id]
	)

	const replies = repliesData ?? []
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
				</div>

				{/* Comment content */}
				{comment.content && (
					<div className="mt-2">
						<Markdown>{comment.content}</Markdown>
					</div>
				)}

				{/* Attached translations */}
				<CommentTranslations comment={comment} />

				{/* Comment actions */}
				<div className="text-muted-foreground mt-3 flex items-center gap-4 text-sm">
					<UpvotePhraseComment comment={comment} />
					<div className="flex items-center gap-2">
						<AddPhraseCommentDialog
							phraseLang={lang}
							phraseId={comment.phrase_id}
							parentCommentId={comment.id}
						>
							<DialogTrigger
								aria-label="Add a reply"
								className={buttonVariants({ variant: 'ghost', size: 'icon' })}
								data-testid="reply-to-phrase-comment-button"
							>
								<MessagesSquare />
							</DialogTrigger>
						</AddPhraseCommentDialog>{' '}
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

				{/* Replies */}
				{showSubthread && replies && replies.length > 0 && (
					<div className="border-3-mlo-primary mt-3 space-y-3">
						<Separator />
						<div className="divide-y">
							{replies.map(({ reply }) => (
								<PhraseCommentReply key={reply.id} comment={reply} />
							))}
						</div>
						<AddPhraseCommentDialog
							parentCommentId={comment.id}
							phraseId={comment.phrase_id}
							phraseLang={lang}
						/>
					</div>
				)}
			</div>
		</div>
	)
}

function CommentTranslations({ comment }: { comment: PhraseCommentType }) {
	// Get translation links for this comment
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

	// Resolve translation_ids to actual translations
	const allTranslations = (phrase.translations_mine ?? []).concat(
		phrase.translations_other ?? []
	)
	const translations = links
		.map((link) => allTranslations.find((t) => t.id === link.translation_id))
		.filter((t): t is NonNullable<typeof t> => t !== undefined && t !== null)

	if (!translations.length) return null

	return (
		<div className="mt-3 space-y-2" data-testid="comment-translation-link">
			{translations.map((translation) => (
				<div
					key={translation.id}
					className="bg-muted flex items-baseline gap-2 rounded-lg p-2"
				>
					<LangBadge lang={translation.lang} />
					<span className="text-sm">{translation.text}</span>
				</div>
			))}
		</div>
	)
}

function PhraseCommentReply({ comment }: { comment: PhraseCommentType }) {
	const isHighlighted = useSearch({
		strict: false,
		select: (data) => data.highlightComment === comment.id,
	})

	return (
		<div
			className={`mt-4 ${isHighlighted ? 'border-s-primary rounded border-s-2 ps-3' : ''}`}
			data-testid="phrase-comment-reply"
		>
			<div className="flex items-center justify-between">
				<UidPermalinkInline
					uid={comment.uid}
					timeValue={comment.created_at}
					action="replied"
				/>
			</div>

			{comment.content && (
				<div className="ms-9 mt-2">
					<Markdown>{comment.content}</Markdown>
				</div>
			)}

			{/* Attached translations */}
			<div className="ms-9">
				<CommentTranslations comment={comment} />
			</div>

			<div className="text-muted-foreground ms-9 mt-3 mb-2 flex items-center gap-2 pb-2">
				<UpvotePhraseComment comment={comment} />
			</div>
		</div>
	)
}
