import { useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import * as z from 'zod'
import { toastError, toastSuccess } from '@/components/ui/sonner'

import type { uuid } from '@/types/main'
import { Button } from '@/components/ui/button'
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { AuthenticatedDialogContent } from '@/components/ui/authenticated-dialog'
import { Separator } from '@/components/ui/separator'
import { MarkdownHint } from './comment-dialog'
import supabase from '@/lib/supabase-client'
import { safeWrite } from '@/lib/collections/safe-write'
import {
	commentPhraseLinksCollection,
	commentUpvotesCollection,
	commentsCollection,
} from '@/features/comments/collections'
import { useOneComment } from '@/features/comments/hooks'
import {
	CommentPhraseLinkSchema,
	type CommentPhraseLinkType,
	RequestCommentSchema,
	type RequestCommentType,
} from '@/features/comments/schemas'
import { UidPermalink } from '@/components/card-pieces/user-permalink'
import { Markdown } from '@/components/my-markdown'
import { useAppForm } from '@/components/form'

type ReplyDialogMode =
	| { kind: 'new'; parentCommentId: uuid }
	| { kind: 'edit'; comment: RequestCommentType }

/**
 * Derives the reply dialog mode from URL search params and a comment lookup.
 * Returns undefined when no reply dialog should be open.
 */
export function deriveReplyDialogMode(
	search: {
		focus?: string
		mode?: string
	},
	editComment?: RequestCommentType
): ReplyDialogMode | undefined {
	if (search.mode === 'reply' && search.focus) {
		return { kind: 'new', parentCommentId: search.focus }
	}
	if (search.mode === 'edit' && editComment?.parent_comment_id != null) {
		return { kind: 'edit', comment: editComment }
	}
	return undefined
}

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
				const { mode: _, ...rest } = prev
				return rest
			},
		})
	}

	const parentCommentId =
		mode?.kind === 'new'
			? mode.parentCommentId
			: mode?.kind === 'edit'
				? mode.comment.parent_comment_id!
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
					{mode?.kind === 'edit'
						? 'Edit your reply'
						: 'Write a reply to this comment'}
				</DialogDescription>
				{parentCommentId && (
					<>
						<CommentContext id={parentCommentId} />
						<Separator />
					</>
				)}
				{mode?.kind === 'edit' ? (
					<EditReplyForm comment={mode.comment} onClose={close} />
				) : mode?.kind === 'new' ? (
					<NewReplyForm
						requestId={requestId}
						lang={lang}
						parentCommentId={mode.parentCommentId}
						onClose={close}
					/>
				) : null}
			</AuthenticatedDialogContent>
		</Dialog>
	)
}

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

const ReplyFormSchema = z.object({
	content: z
		.string()
		.min(1, 'Please enter a reply')
		.max(1000, 'Reply must be less than 1000 characters'),
})

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
		onSuccess: async (data) => {
			const comment = RequestCommentSchema.parse(data.request_comment)
			await safeWrite(
				() => commentsCollection.preload(),
				() => commentsCollection.utils.writeInsert(comment)
			)
			await safeWrite(
				() => commentUpvotesCollection.preload(),
				() =>
					commentUpvotesCollection.utils.writeInsert({
						comment_id: comment.id,
					})
			)
			if (data.comment_phrase_links?.length) {
				const links = data.comment_phrase_links.map((l) =>
					CommentPhraseLinkSchema.parse(l)
				)
				await safeWrite(
					() => commentPhraseLinksCollection.preload(),
					() =>
						links.forEach((link) =>
							commentPhraseLinksCollection.utils.writeInsert(link)
						)
				)
			}
			void navigate({
				to: '/learn/$lang/requests/$id',
				params: { lang, id: requestId },
				search: { focus: parentCommentId },
			})
			toastSuccess('Reply posted!')
			onClose()
		},
		onError: (error: Error) => {
			toastError(`Failed to post reply: ${error.message}`)
			console.log('Error', error)
		},
	})

	const form = useAppForm({
		defaultValues: { content: '' },
		validators: { onChange: ReplyFormSchema },
		onSubmit: async ({ value, formApi }) => {
			await createMutation.mutateAsync(value)
			formApi.reset()
		},
	})

	return (
		<form
			data-testid="new-reply-form"
			noValidate
			className="space-y-4"
			onSubmit={(e) => {
				e.preventDefault()
				e.stopPropagation()
				void form.handleSubmit()
			}}
		>
			<MarkdownHint />
			<form.AppField name="content">
				{(field) => (
					<field.TextareaInput placeholder="Write a reply..." rows={3} />
				)}
			</form.AppField>
			<form.AppForm>
				<form.SubmitButton pendingText="Posting...">
					Post Reply
				</form.SubmitButton>
			</form.AppForm>
		</form>
	)
}

function EditReplyForm({
	comment,
	onClose,
}: {
	comment: RequestCommentType
	onClose: () => void
}) {
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
		onSuccess: async (data) => {
			const parsed = RequestCommentSchema.parse(data)
			await safeWrite(
				() => commentsCollection.preload(),
				() => commentsCollection.utils.writeUpdate(parsed)
			)
			toastSuccess('Reply updated!')
			onClose()
		},
		onError: (error: Error) => {
			toastError(`Failed to update reply: ${error.message}`)
			console.log('Error', error)
		},
	})

	const form = useAppForm({
		defaultValues: { content: comment.content },
		validators: { onChange: ReplyFormSchema },
		onSubmit: async ({ value }) => {
			await updateMutation.mutateAsync(value)
		},
	})

	return (
		<form
			data-testid="edit-reply-form"
			noValidate
			className="space-y-4"
			onSubmit={(e) => {
				e.preventDefault()
				e.stopPropagation()
				void form.handleSubmit()
			}}
		>
			<MarkdownHint />
			<form.AppField name="content">
				{(field) => (
					<field.TextareaInput placeholder="Write a reply..." rows={3} />
				)}
			</form.AppField>
			<div className="flex gap-2">
				<form.AppForm>
					<form.SubmitButton pendingText="Saving...">Save</form.SubmitButton>
				</form.AppForm>
				<Button type="button" variant="neutral" onClick={onClose}>
					Cancel
				</Button>
			</div>
		</form>
	)
}
