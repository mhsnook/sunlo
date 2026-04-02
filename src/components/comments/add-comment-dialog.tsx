import { ReactNode, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { eq, useLiveQuery } from '@tanstack/react-db'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toastError, toastSuccess } from '@/components/ui/sonner'

import type { UseLiveQueryResult, uuid } from '@/types/main'
import { Button } from '@/components/ui/button'
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import {
	Dialog,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { AuthenticatedDialogContent } from '@/components/ui/authenticated-dialog'
import supabase from '@/lib/supabase-client'
import {
	commentPhraseLinksCollection,
	commentUpvotesCollection,
	commentsCollection,
} from '@/features/comments/collections'
import {
	CommentPhraseLinkSchema,
	CommentPhraseLinkType,
	RequestCommentSchema,
	RequestCommentType,
} from '@/features/comments/schemas'
import { useRequest } from '@/features/requests/hooks'
import { TinySelfAvatar, UidPermalink } from '../card-pieces/user-permalink'
import { Markdown } from '../my-markdown'
import { Separator } from '../ui/separator'

function CommentDisplayOnly({ id }: { id: uuid }) {
	const { data, isLoading } = useOneComment(id)
	return isLoading || !data ? null : (
			<DisplayBlock markdown={data.content} uid={data.uid} />
		)
}

function RequestDisplayOnly({ id }: { id: uuid }) {
	const { data, isLoading } = useRequest(id)
	return isLoading || !data ? null : (
			<DisplayBlock markdown={data.prompt} uid={data.requester_uid} />
		)
}

function DisplayBlock({ markdown, uid }: { markdown: string; uid: uuid }) {
	return (
		<div>
			<UidPermalink uid={uid} nonInteractive />
			<div className="mt-2 text-sm">
				<Markdown>{markdown}</Markdown>
			</div>
		</div>
	)
}

export function AddCommentDialog({
	requestId,
	lang,
	parentCommentId,
	children,
}: {
	requestId: uuid
	lang: string
	parentCommentId?: uuid
	children?: ReactNode
}) {
	const [open, setOpen] = useState(false)

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{children ?? (
				<DialogTrigger className="@group flex grow cursor-pointer flex-row items-center gap-2">
					<TinySelfAvatar className="grow-o shrink-0" />
					<p className="bg-card/50 hover:bg-card/50 text-muted-foreground/70 w-full rounded-xl border px-2 py-1.5 pe-6 text-start text-sm shadow-xs inset-shadow-sm">
						{parentCommentId ? 'Type your reply here' : 'Add a comment...'}
						...
					</p>
				</DialogTrigger>
			)}
			<AuthenticatedDialogContent
				authTitle="Login to Comment"
				authMessage="You need to be logged in to join the conversation."
				className="@container max-h-[90dvh] overflow-y-auto p-4 sm:p-6"
				data-testid="add-comment-dialog"
			>
				<DialogTitle className="sr-only">
					{parentCommentId ? 'Reply to comment' : 'Add a comment'}
				</DialogTitle>
				<DialogDescription className="sr-only">
					{parentCommentId ?
						'Write a reply to this comment'
					:	'Share your thoughts'}
				</DialogDescription>
				{parentCommentId ?
					<CommentDisplayOnly id={parentCommentId} />
				:	<RequestDisplayOnly id={requestId} />}
				<Separator />
				<NewCommentForm
					requestId={requestId}
					lang={lang}
					parentCommentId={parentCommentId}
					onSuccess={() => setOpen(false)}
				/>
			</AuthenticatedDialogContent>
		</Dialog>
	)
}

const CommentFormSchema = z.object({
	content: z
		.string()
		.min(1, 'Please enter a comment')
		.max(1000, 'Comment must be less than 1000 characters'),
})

type CommentFormInputs = z.infer<typeof CommentFormSchema>

function useOneComment(
	commentId: uuid
): UseLiveQueryResult<RequestCommentType> {
	return useLiveQuery(
		(q) =>
			q
				.from({ comment: commentsCollection })
				.where(({ comment }) => eq(comment.id, commentId))
				.findOne(),
		[commentId]
	)
}

function NewCommentForm({
	requestId,
	lang,
	parentCommentId,
	onSuccess,
}: {
	requestId: uuid
	lang: string
	parentCommentId?: uuid
	onSuccess: () => void
}) {
	const navigate = useNavigate()
	const isReply = !!parentCommentId

	const form = useForm<CommentFormInputs>({
		resolver: zodResolver(CommentFormSchema),
		defaultValues: { content: '' },
	})

	const createCommentMutation = useMutation({
		mutationFn: async (values: CommentFormInputs) => {
			const { data, error } = await supabase.rpc(
				'create_comment_with_phrases',
				{
					p_request_id: requestId,
					p_content: values.content,
					p_parent_comment_id: parentCommentId,
					p_phrase_ids: [],
				}
			)
			if (error) throw error
			return data as {
				request_comment: RequestCommentType
				comment_phrase_links: CommentPhraseLinkType[]
			}
		},
		onSuccess: (data) => {
			commentsCollection.utils.writeInsert(
				RequestCommentSchema.parse(data.request_comment)
			)
			commentUpvotesCollection.utils.writeInsert({
				comment_id: data.request_comment.id,
			})
			if (
				data.comment_phrase_links &&
				Array.isArray(data.comment_phrase_links)
			) {
				data.comment_phrase_links.forEach((link) => {
					commentPhraseLinksCollection.utils.writeInsert(
						CommentPhraseLinkSchema.parse(link)
					)
				})
			}
			form.reset()
			void navigate({
				to: '/learn/$lang/requests/$id',
				params: { lang, id: requestId },
				search: { focus: parentCommentId },
			})
			toastSuccess(isReply ? 'Reply posted!' : 'Comment posted!')
			onSuccess()
		},
		onError: (error: Error) => {
			toastError(
				`Failed to post ${isReply ? 'reply' : 'comment'}: ${error.message}`
			)
		},
	})

	return (
		<Form {...form}>
			<form
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				onSubmit={form.handleSubmit((data) =>
					createCommentMutation.mutate(data)
				)}
				className="space-y-4"
			>
				<FormField
					control={form.control}
					name="content"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="sr-only">
								{isReply ? 'Write a reply' : 'Add a comment'}
							</FormLabel>
							<p className="text-muted-foreground text-xs">
								Comments support markdown like `&gt;` for blockquote,{' '}
								<em>_italics_</em>, <strong>**bold**</strong>
							</p>
							<FormControl>
								<Textarea
									data-testid="comment-content-input"
									placeholder={
										isReply ? 'Write a reply...' : 'Share your thoughts...'
									}
									rows={isReply ? 3 : 4}
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<Button
					type="submit"
					data-testid="post-comment-button"
					disabled={createCommentMutation.isPending}
				>
					{createCommentMutation.isPending ?
						'Posting...'
					: isReply ?
						'Post Reply'
					:	'Post Comment'}
				</Button>
			</form>
		</Form>
	)
}
