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
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { AuthenticatedDialogContent } from '@/components/ui/authenticated-dialog'
import { Separator } from '@/components/ui/separator'
import supabase from '@/lib/supabase-client'
import {
	commentUpvotesCollection,
	commentsCollection,
} from '@/features/comments/collections'
import {
	CommentPhraseLinkSchema,
	type CommentPhraseLinkType,
	RequestCommentSchema,
	type RequestCommentType,
} from '@/features/comments/schemas'
import { commentPhraseLinksCollection } from '@/features/comments/collections'
import { UidPermalink } from '@/components/card-pieces/user-permalink'
import { Markdown } from '@/components/my-markdown'

// ---------------------------------------------------------------------------
// URL state types
// ---------------------------------------------------------------------------

type ReplyDialogMode =
	| { kind: 'new'; parentCommentId: uuid }
	| { kind: 'edit'; comment: RequestCommentType }

/**
 * Derives the reply dialog mode from URL search params and a comment lookup.
 * Returns undefined when no reply dialog should be open.
 */
export function deriveReplyDialogMode(
	search: {
		replying?: string
		editing?: string
	},
	editComment?: RequestCommentType
): ReplyDialogMode | undefined {
	if (search.replying) {
		return { kind: 'new', parentCommentId: search.replying }
	}
	if (search.editing && editComment?.parent_comment_id != null) {
		return { kind: 'edit', comment: editComment }
	}
	return undefined
}

// ---------------------------------------------------------------------------
// ReplyDialog
// ---------------------------------------------------------------------------

interface ReplyDialogProps {
	requestId: uuid
	lang: string
	mode: ReplyDialogMode | undefined
}

export function ReplyDialog({ requestId, lang, mode }: ReplyDialogProps) {
	const navigate = useNavigate()

	const isOpen = !!mode

	const close = () => {
		void navigate({
			to: '.',
			search: (prev: Record<string, unknown>) => {
				const { replying: _, editing: __, ...rest } = prev
				return rest
			},
		})
	}

	const parentCommentId =
		mode?.kind === 'new' ? mode.parentCommentId
		: mode?.kind === 'edit' ? mode.comment.parent_comment_id!
		: undefined

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) close()
			}}
		>
			<AuthenticatedDialogContent
				authTitle="Login to Comment"
				authMessage="You need to be logged in to join the conversation."
				className="@container max-h-[90dvh] overflow-y-auto p-4 sm:p-6"
				data-testid="reply-dialog"
			>
				<DialogTitle className="sr-only">
					{mode?.kind === 'edit' ? 'Edit Reply' : 'Reply to comment'}
				</DialogTitle>
				<DialogDescription className="sr-only">
					{mode?.kind === 'edit' ?
						'Edit your reply'
					:	'Write a reply to this comment'}
				</DialogDescription>
				{parentCommentId && (
					<>
						<CommentContext id={parentCommentId} />
						<Separator />
					</>
				)}
				{mode?.kind === 'edit' ?
					<EditReplyForm comment={mode.comment} onClose={close} />
				: mode?.kind === 'new' ?
					<NewReplyForm
						requestId={requestId}
						lang={lang}
						parentCommentId={mode.parentCommentId}
						onClose={close}
					/>
				:	null}
			</AuthenticatedDialogContent>
		</Dialog>
	)
}

// ---------------------------------------------------------------------------
// Context display
// ---------------------------------------------------------------------------

function CommentContext({ id }: { id: uuid }) {
	const { data, isLoading } = useOneComment(id)
	if (isLoading || !data) return null
	return (
		<div>
			<UidPermalink uid={data.uid} nonInteractive />
			<div className="mt-2 text-sm">
				<Markdown>{data.content}</Markdown>
			</div>
		</div>
	)
}

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

// ---------------------------------------------------------------------------
// Reply form schema (shared)
// ---------------------------------------------------------------------------

const ReplyFormSchema = z.object({
	content: z
		.string()
		.min(1, 'Please enter a reply')
		.max(1000, 'Reply must be less than 1000 characters'),
})

// ---------------------------------------------------------------------------
// New reply form (2 new)
// ---------------------------------------------------------------------------

function NewReplyForm({
	requestId,
	lang,
	parentCommentId,
	onClose,
}: {
	requestId: uuid
	lang: string
	parentCommentId: uuid
	onClose: () => void
}) {
	const navigate = useNavigate()

	const form = useForm<{ content: string }>({
		resolver: zodResolver(ReplyFormSchema),
		defaultValues: { content: '' },
	})

	const createMutation = useMutation({
		mutationFn: async (values: { content: string }) => {
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
				search: { showSubthread: parentCommentId },
			})
			toastSuccess('Reply posted!')
			onClose()
		},
		onError: (error: Error) => {
			toastError(`Failed to post reply: ${error.message}`)
			console.log('Error', error)
		},
	})

	return (
		<Form {...form}>
			<form
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
				className="space-y-4"
			>
				<FormField
					control={form.control}
					name="content"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="sr-only">Write a reply</FormLabel>
							<p className="text-muted-foreground text-xs">
								Comments support markdown like `&gt;` for blockquote,{' '}
								<em>_italics_</em>, <strong>**bold**</strong>
							</p>
							<FormControl>
								<Textarea
									data-testid="reply-content-input"
									placeholder="Write a reply..."
									rows={3}
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<Button
					type="submit"
					data-testid="post-reply-button"
					disabled={createMutation.isPending}
				>
					{createMutation.isPending ? 'Posting...' : 'Post Reply'}
				</Button>
			</form>
		</Form>
	)
}

// ---------------------------------------------------------------------------
// Edit reply form (2 edit)
// ---------------------------------------------------------------------------

function EditReplyForm({
	comment,
	onClose,
}: {
	comment: RequestCommentType
	onClose: () => void
}) {
	const form = useForm<{ content: string }>({
		resolver: zodResolver(ReplyFormSchema),
		defaultValues: { content: comment.content },
	})

	const updateMutation = useMutation({
		mutationFn: async (values: { content: string }) => {
			const { data, error } = await supabase
				.from('request_comment')
				.update({ content: values.content })
				.eq('id', comment.id)
				.select()
				.single()
			if (error) throw error
			return data
		},
		onSuccess: (data) => {
			commentsCollection.utils.writeUpdate(RequestCommentSchema.parse(data))
			toastSuccess('Reply updated!')
			onClose()
		},
		onError: (error: Error) => {
			toastError(`Failed to update reply: ${error.message}`)
			console.log('Error', error)
		},
	})

	return (
		<Form {...form}>
			<form
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))}
				className="space-y-4"
			>
				<FormField
					control={form.control}
					name="content"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="sr-only">Edit your reply</FormLabel>
							<p className="text-muted-foreground text-xs">
								Comments support markdown like `&gt;` for blockquote,{' '}
								<em>_italics_</em>, <strong>**bold**</strong>
							</p>
							<FormControl>
								<Textarea
									data-testid="edit-reply-content-input"
									placeholder="Write a reply..."
									rows={3}
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex gap-2">
					<Button
						type="submit"
						data-testid="save-reply-button"
						disabled={updateMutation.isPending}
					>
						{updateMutation.isPending ? 'Saving...' : 'Save'}
					</Button>
					<Button type="button" variant="neutral" onClick={onClose}>
						Cancel
					</Button>
				</div>
			</form>
		</Form>
	)
}
