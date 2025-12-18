import { Link, useSearch } from '@tanstack/react-router'
import { eq, useLiveQuery } from '@tanstack/react-db'
import { ChevronDown, ChevronUp, MessagesSquare } from 'lucide-react'

import UserPermalink from '@/components/card-pieces/user-permalink'
import { Markdown } from '@/components/my-markdown'
import { CardResultSimple } from '@/components/cards/card-result-simple'
import { AddCommentDialog } from './add-comment-dialog'
import { commentsCollection, publicProfilesCollection } from '@/lib/collections'
import { useUserId } from '@/lib/use-auth'
import { type RequestCommentType } from '@/lib/schemas'
import { useOnePublicProfile } from '@/hooks/use-public-profile'
import { usePhrasesFromComment } from '@/hooks/use-comments'
import { buttonVariants } from '@/components/ui/button-variants'

import { DeleteCommentDialog } from './delete-comment-dialog'
import { DialogTrigger } from '../ui/dialog'
import { UpdateCommentDialog } from './update-comment-dialog'
import { Upvote } from './upvote'

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

	// Get profile for this comment
	const { data: profileData } = useOnePublicProfile(comment.uid)

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
	const { data: phraseData } = usePhrasesFromComment(comment.id)

	const phrases = phraseData ?? []

	const isOwner = userId === comment.uid
	const replyCount = replies?.length ?? 0

	return (
		<div
			className={`${isHighlighted ? 'bg-primary/30 ring-primary-foresoft/60 ring ring-offset-4' : ''} pt-4`}
		>
			{/* Comment header */}
			<div className="flex items-center justify-between">
				<UserPermalink
					uid={comment.uid}
					username={profileData?.username ?? ''}
					avatar_path={profileData?.avatar_path ?? ''}
					timeValue={comment.created_at}
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
					{phrases.map((phrase) => (
						<div key={phrase.id} className="border-primary border-l-2 pl-3">
							<CardResultSimple phrase={phrase} />
						</div>
					))}
				</div>
			)}

			{/* Comment actions */}
			<div className="mt-3 mb-2 flex items-center gap-2 pb-2">
				<Upvote comment={comment} />
				<AddCommentDialog
					// @@TODO THIS IS NOT WORKING
					lang={lang}
					requestId={comment.request_id}
					parentCommentId={comment.id}
				>
					<DialogTrigger
						className={buttonVariants({ variant: 'ghost', size: 'icon' })}
					>
						<MessagesSquare />
					</DialogTrigger>
				</AddCommentDialog>

				{replyCount > 0 && (
					<Link
						className={buttonVariants({ variant: 'ghost', size: 'sm' })}
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
						{showSubthread ? 'Hide' : `Show ${replyCount}`}
						{replyCount === 1 ? ' reply' : ' replies'}
					</Link>
				)}
			</div>

			{/* Replies */}
			{showSubthread && replies && replies.length > 0 && (
				<div className="border-primary-foresoft/30 ms-4 mt-3 space-y-3 border-s ps-4">
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
	)
}

function CommentReply({ comment, lang }: CommentThreadProps) {
	const { data: phraseData } = usePhrasesFromComment(comment.id)
	const { data: profileData } = useOnePublicProfile(comment.uid)
	const isHighlighted = useSearch({
		strict: false,
		select: (data) => data.highlightComment === comment.id,
	})
	const userId = useUserId()
	const phrases = phraseData ?? []

	const isOwner = userId === comment.uid

	return (
		<div
			className={`my-4 ${isHighlighted ? 'bg-primary/30 ring-primary-foresoft/60 ring ring-offset-4' : ''}`}
		>
			{/* Comment header */}
			<div className="flex items-center justify-between">
				<UserPermalink
					uid={comment.uid}
					username={profileData?.username ?? ''}
					avatar_path={profileData?.avatar_path ?? ''}
					timeValue={comment.created_at}
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
					{phrases.map((phrase) => (
						<div key={phrase.id} className="border-primary border-l-2 pl-3">
							<CardResultSimple phrase={phrase} />
						</div>
					))}
				</div>
			)}

			{/* Comment actions */}
			<div className="mt-3 mb-2 flex items-center gap-2 pb-2">
				<Upvote comment={comment} />
			</div>
		</div>
	)
}
