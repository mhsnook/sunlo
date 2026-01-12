import { ReactNode, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { eq, useLiveQuery } from '@tanstack/react-db'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'

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
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import { AuthenticatedDialogContent } from '@/components/ui/authenticated-dialog'
import supabase from '@/lib/supabase-client'
import {
	commentPhraseLinksCollection,
	commentsCollection,
} from '@/lib/collections'
import {
	CommentPhraseLinkSchema,
	CommentPhraseLinkType,
	RequestCommentSchema,
	RequestCommentType,
} from '@/lib/schemas'
import { PhraseTinyCard } from '@/components/cards/phrase-tiny-card'
import { useRequest } from '@/hooks/use-requests'
import { TinySelfAvatar, UidPermalink } from '../card-pieces/user-permalink'
import { Markdown } from '../my-markdown'
import { Separator } from '../ui/separator'
import { SelectPhrasesForComment } from './select-phrases-for-comment'

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
			<div className="ms-13 text-sm">
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
				<DialogTrigger className="@group flex w-full grow cursor-pointer flex-row items-center justify-between gap-2">
					<TinySelfAvatar className="grow-o shrink-0" />
					<p className="bg-card/50 hover:bg-card/50 text-muted-foreground/70 w-full rounded-xl border px-2 py-1.5 pe-6 text-start text-sm shadow-xs inset-shadow-sm">
						{parentCommentId ? 'Type your reply here' : 'Join the conversation'}
						...
					</p>
				</DialogTrigger>
			)}
			<AuthenticatedDialogContent
				authTitle="Login to Comment"
				authMessage="You need to be logged in to join the conversation."
				className="max-h-[90vh] overflow-y-auto"
			>
				{parentCommentId ?
					<CommentDisplayOnly id={parentCommentId} />
				:	<RequestDisplayOnly id={requestId} />}
				<Separator />
				<NewCommentForm
					requestId={requestId}
					lang={lang}
					parentCommentId={parentCommentId}
					onSuccess={() => {
						setOpen(false)
					}}
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

interface CommentFormProps {
	requestId: uuid
	lang: string
	parentCommentId?: uuid
	onSuccess: () => void
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

function NewCommentForm({
	requestId,
	lang,
	parentCommentId,
	onSuccess,
}: CommentFormProps) {
	const [selectedPhraseIds, setSelectedPhraseIds] = useState<uuid[]>([])

	const navigate = useNavigate()

	const isReply = !!parentCommentId

	const form = useForm<CommentFormInputs>({
		resolver: zodResolver(CommentFormSchema),
		defaultValues: {
			content: '',
		},
	})

	const createCommentMutation = useMutation({
		mutationFn: async (values: CommentFormInputs) => {
			const { data, error } = await supabase.rpc(
				'create_comment_with_phrases',
				{
					p_request_id: requestId,
					p_content: values.content,
					p_parent_comment_id: parentCommentId,
					p_phrase_ids: selectedPhraseIds,
				}
			)
			if (error) throw error
			return data as {
				request_comment: RequestCommentType
				comment_phrase_links: CommentPhraseLinkType[]
			}
		},
		onSuccess: (data) => {
			// Parse and add to collection
			commentsCollection.utils.writeInsert(
				RequestCommentSchema.parse(data.request_comment)
			)

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
			// Reset form
			form.reset()
			setSelectedPhraseIds([])
			void navigate({
				to: '/learn/$lang/requests/$id',
				params: { lang, id: requestId },
				search: { showSubthread: parentCommentId },
			})
			toast.success(isReply ? 'Reply posted!' : 'Comment posted!')
			onSuccess()
		},
		onError: (error: Error) => {
			toast.error(
				`Failed to post ${isReply ? 'reply' : 'comment'}: ${error.message}`
			)
		},
	})

	const handleRemovePhrase = (phraseId: uuid) => {
		setSelectedPhraseIds((prev) => prev.filter((id) => id !== phraseId))
	}

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

							<FormControl>
								<Textarea
									data-testid="comment-textarea"
									placeholder={
										isReply ? 'Write a reply...' : (
											'Share your thoughts or answer the request...'
										)
									}
									rows={isReply ? 3 : 4}
									{...field}
								/>
							</FormControl>
							{!isReply && (
								<p className="text-muted-foreground text-sm">
									Comments support markdown like `&gt;` for blockquote,{' '}
									<em>_italics_</em>, <strong>**bold**</strong>
								</p>
							)}
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Attached flashcards */}
				{selectedPhraseIds && selectedPhraseIds.length > 0 && (
					<div className="mb-0">
						<p className="text-sm font-medium">
							Attached flashcards ({selectedPhraseIds.length}/4)
						</p>
						<div className="flex flex-wrap gap-x-2">
							{selectedPhraseIds.map((pid) => (
								<div key={pid} className="relative px-2">
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="border-border absolute top-5 right-1 h-6 w-6 backdrop-blur-xs"
										onClick={() => handleRemovePhrase(pid)}
									>
										<X />
									</Button>
									<PhraseTinyCard pid={pid} className="mb-0" />
								</div>
							))}
						</div>
					</div>
				)}

				<div className="flex flex-row items-center justify-between gap-2">
					<div className="flex flex-row gap-2">
						{/* Submit button */}
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
					</div>

					{/* Add flashcard button */}
					<SelectPhrasesForComment
						lang={lang}
						selectedPhraseIds={selectedPhraseIds}
						onSelectionChange={setSelectedPhraseIds}
					/>
				</div>
			</form>
		</Form>
	)
}
