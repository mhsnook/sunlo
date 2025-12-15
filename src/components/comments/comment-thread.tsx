import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { eq, useLiveQuery } from '@tanstack/react-db'
import toast from 'react-hot-toast'
import {
	ThumbsUp,
	MessageSquare,
	Edit,
	Trash2,
	ChevronDown,
	ChevronUp,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import UserPermalink from '@/components/card-pieces/user-permalink'
import { Markdown } from '@/components/my-markdown'
import { CardResultSimple } from '@/components/cards/card-result-simple'
import { AddReplyForm } from './add-reply-form'
import { ReplyDisplay } from './reply-display'
import supabase from '@/lib/supabase-client'
import {
	commentsCollection,
	commentUpvotesCollection,
	publicProfilesCollection,
} from '@/lib/collections'
import { useUserId } from '@/lib/use-auth'
import type { RequestCommentType } from '@/lib/schemas'
import { useOnePublicProfile } from '@/hooks/use-public-profile'
import { uuid } from '@/types/main'
import { usePhrasesFromComment } from '@/hooks/use-comments'

interface CommentThreadProps {
	comment: RequestCommentType
	lang: string
}

function useRepliesToComment(commentId: uuid) {
	return useLiveQuery(
		(q) =>
			q
				.from({ reply: commentsCollection })
				.where(({ reply }) => eq(reply.parent_comment_id, commentId))
				.join({ profile: publicProfilesCollection }, ({ reply, profile }) =>
					eq(profile.uid, reply.commenter_uid)
				)
				.orderBy(({ reply }) => reply.created_at, 'asc'),
		[commentId]
	)
}

function useIsCommentUpvoted(commentId: uuid) {
	const { data, isLoading } = useLiveQuery(
		(q) =>
			q
				.from({ upvote: commentUpvotesCollection })
				.where(({ upvote }) => eq(upvote.comment_id, commentId)),
		[commentId]
	)
	return { data: data?.length > 0, isLoading }
}

export function CommentThread({ comment, lang }: CommentThreadProps) {
	const userId = useUserId()
	const [isReplying, setIsReplying] = useState(false)
	const [isEditing, setIsEditing] = useState(false)
	const [editContent, setEditContent] = useState(comment.content)
	const [showReplies, setShowReplies] = useState(false)
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

	// Get profile for this comment
	const { data: profileData } = useOnePublicProfile(comment.commenter_uid)

	// Get replies for this comment
	const { data: repliesData } = useRepliesToComment(comment.id)

	const replies = repliesData ?? []

	// Get phrases for this comment with a join
	const { data: phraseData } = usePhrasesFromComment(comment.id)

	const phrases = phraseData ?? []

	// Check if user has upvoted
	const { data: hasUpvoted } = useIsCommentUpvoted(comment.id)

	// Toggle upvote mutation
	const toggleUpvoteMutation = useMutation({
		mutationFn: async () => {
			const { data, error } = await supabase.rpc('toggle_comment_upvote', {
				p_comment_id: comment.id,
			})
			if (error) throw error
			return data as {
				comment_id: uuid
				is_upvoted: boolean
				upvote_count: number
			}
		},
		onSuccess: (data) => {
			// The collection will auto-update via realtime subscriptions
			commentsCollection.utils.writeUpdate({
				id: data.comment_id,
				upvote_count: data.upvote_count ?? 0,
			})
			if (data.is_upvoted == true) {
				commentUpvotesCollection.utils.writeInsert({
					comment_id: data.comment_id,
				})
			} else if (data.is_upvoted == false) {
				commentUpvotesCollection.utils.writeDelete(data.comment_id)
			}
		},
		onError: (error: Error) => {
			toast.error(`Failed to toggle upvote: ${error.message}`)
		},
	})

	// Update comment mutation
	const updateCommentMutation = useMutation({
		mutationFn: async (content: string) => {
			const { data, error } = await supabase.rpc('update_comment', {
				p_comment_id: comment.id,
				p_content: content,
			})
			if (error) throw error
			return data
		},
		onSuccess: (data) => {
			setIsEditing(false)
			toast.success('Comment updated!')
			commentsCollection.utils.writeUpdate(data)
		},
		onError: (error: Error) => {
			toast.error(`Failed to update comment: ${error.message}`)
		},
	})

	// Delete comment mutation
	const deleteCommentMutation = useMutation({
		mutationFn: async () => {
			const { error } = await supabase.rpc('delete_comment', {
				p_comment_id: comment.id,
			})
			if (error) throw error
		},
		onSuccess: () => {
			commentsCollection.utils.writeDelete(comment.id)
			toast.success('Comment deleted!')
		},
		onError: (error: Error) => {
			toast.error(`Failed to delete comment: ${error.message}`)
		},
	})

	const isOwner = userId === comment.commenter_uid
	const replyCount = replies?.length ?? 0

	return (
		<div className="border-b py-4">
			{/* Comment header */}
			<div className="flex items-center justify-between">
				<UserPermalink
					uid={comment.commenter_uid}
					username={profileData?.username ?? ''}
					avatar_path={profileData?.avatar_path ?? ''}
					timeValue={comment.created_at}
					// oxlint-disable-next-line jsx-no-new-object-as-prop
					timeLinkParams={{ id: comment.request_id, lang }}
					timeLinkTo="/learn/$lang/requests/$id"
				/>

				<div className="flex gap-2">
					{isOwner && !isEditing && (
						<>
							<Button
								variant="ghost"
								size="icon"
								// oxlint-disable-next-line jsx-no-new-function-as-prop
								onClick={() => setIsEditing(true)}
							>
								<Edit className="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								// oxlint-disable-next-line jsx-no-new-function-as-prop
								onClick={() => setDeleteDialogOpen(true)}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</>
					)}
				</div>
			</div>

			{/* Comment content */}
			{isEditing ?
				<div className="mt-2 space-y-2">
					<Textarea
						value={editContent}
						// oxlint-disable-next-line jsx-no-new-function-as-prop
						onChange={(e) => setEditContent(e.target.value)}
						rows={4}
					/>
					<div className="flex gap-2">
						<Button
							size="sm"
							// oxlint-disable-next-line jsx-no-new-function-as-prop
							onClick={() => updateCommentMutation.mutate(editContent)}
							disabled={updateCommentMutation.isPending}
						>
							{updateCommentMutation.isPending ? 'Saving...' : 'Save'}
						</Button>
						<Button
							size="sm"
							variant="ghost"
							// oxlint-disable-next-line jsx-no-new-function-as-prop
							onClick={() => {
								setIsEditing(false)
								setEditContent(comment.content)
							}}
						>
							Cancel
						</Button>
					</div>
				</div>
			:	comment.content && (
					<div className="mt-2">
						<Markdown>{comment.content}</Markdown>
					</div>
				)
			}

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
			<div className="mt-3 flex gap-2">
				<Button
					variant={hasUpvoted ? 'outline' : 'outline'}
					size="sm"
					// oxlint-disable-next-line jsx-no-new-function-as-prop
					onClick={() => toggleUpvoteMutation.mutate()}
					disabled={toggleUpvoteMutation.isPending}
					className={hasUpvoted ? 'border-primary-foresoft/60' : ''}
				>
					<ThumbsUp
						className={
							hasUpvoted ?
								'fill-primary-foresoft stroke-primary-foresoft/30'
							:	''
						}
					/>
					{comment.upvote_count}
				</Button>

				<Button
					variant="ghost"
					size="sm"
					// oxlint-disable-next-line jsx-no-new-function-as-prop
					onClick={() => setIsReplying(!isReplying)}
				>
					<MessageSquare className="mr-1 h-4 w-4" />
					Reply
				</Button>

				{replyCount > 0 && (
					<Button
						variant="ghost"
						size="sm"
						// oxlint-disable-next-line jsx-no-new-function-as-prop
						onClick={() => setShowReplies(!showReplies)}
					>
						{showReplies ?
							<ChevronUp className="mr-1 h-4 w-4" />
						:	<ChevronDown className="mr-1 h-4 w-4" />}
						{replyCount} {replyCount === 1 ? 'reply' : 'replies'}
					</Button>
				)}
			</div>

			{/* Reply form */}
			{isReplying && (
				<div className="border-primary-foresoft/30 ms-4 mt-3 border-s ps-4">
					<AddReplyForm
						parentCommentId={comment.id}
						requestId={comment.request_id}
						lang={lang}
						// oxlint-disable-next-line jsx-no-new-function-as-prop
						onCancel={() => setIsReplying(false)}
					/>
				</div>
			)}

			{/* Replies */}
			{showReplies && replies && replies.length > 0 && (
				<div className="border-primary-foresoft/30 ms-4 mt-3 space-y-3 border-s ps-4">
					{replies.map(({ reply }) => (
						<ReplyDisplay key={reply.id} reply={reply} lang={lang} />
					))}
				</div>
			)}

			{/* Delete confirmation dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete comment?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete your comment and all its replies.
							This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							// oxlint-disable-next-line jsx-no-new-function-as-prop
							onClick={() => deleteCommentMutation.mutate()}
							className="bg-destructive text-destructive-foreground"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
