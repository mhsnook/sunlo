import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { eq, useLiveQuery } from '@tanstack/react-db'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Edit, X } from 'lucide-react'

import type { UseLiveQueryResult, uuid } from '@/types/main'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'
import { Button, buttonVariants } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
	CommentPhraseLinkSchema,
	RequestCommentSchema,
	type CommentPhraseLinkType,
	type RequestCommentType,
} from '@/features/comments/schemas'
import {
	commentPhraseLinksCollection,
	commentsCollection,
} from '@/features/comments/collections'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import supabase from '@/lib/supabase-client'
import { PhraseTinyCard } from '@/components/cards/phrase-tiny-card'
import { SelectPhrasesForComment } from './select-phrases-for-comment'

export function UpdateCommentButton({
	comment,
}: {
	comment: RequestCommentType
}) {
	return (
		<Link
			to="."
			search={(prev: Record<string, unknown>) => ({
				...prev,
				editing: comment.id,
			})}
			className={buttonVariants({ variant: 'ghost', size: 'icon' })}
			aria-label="Update comment"
			data-testid="edit-comment-button"
		>
			<Edit className="h-4 w-4" />
		</Link>
	)
}

export function UpdateCommentDialog({
	comment,
	lang,
}: {
	comment: RequestCommentType
	lang: string
}) {
	const editing = useSearch({
		strict: false,
		select: (s) => s.editing,
	})
	const isOpen = editing === comment.id
	const navigate = useNavigate()

	const close = () => {
		void navigate({
			to: '.',
			search: (prev: Record<string, unknown>) => {
				const { editing: _, ...rest } = prev
				return rest
			},
		})
	}

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) close()
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Comment</DialogTitle>
					<DialogDescription className="sr-only">
						Edit your comment text and attached flashcards
					</DialogDescription>
				</DialogHeader>
				{isOpen && (
					<EditCommentForm comment={comment} lang={lang} onClose={close} />
				)}
			</DialogContent>
		</Dialog>
	)
}

function useCommentPhraseLinks(
	commentId: uuid
): UseLiveQueryResult<{ link: CommentPhraseLinkType }[]> {
	return useLiveQuery(
		(q) =>
			q
				.from({ link: commentPhraseLinksCollection })
				.where(({ link }) => eq(link.comment_id, commentId)),
		[commentId]
	)
}

function EditCommentForm({
	comment,
	lang,
	onClose,
}: {
	comment: RequestCommentType
	lang: string
	onClose: () => void
}) {
	const { data: existingLinks } = useCommentPhraseLinks(comment.id)

	// Track selected phrase IDs, initialized from existing links
	const [selectedPhraseIds, setSelectedPhraseIds] = useState<Array<uuid>>([])
	const initialized = useRef(false)
	useEffect(() => {
		if (!initialized.current && existingLinks) {
			setSelectedPhraseIds(existingLinks.map(({ link }) => link.phrase_id))
			initialized.current = true
		}
	}, [existingLinks])

	const form = useForm<{ content: string }>({
		resolver: zodResolver(
			z.object({
				content: z
					.string()
					.max(1000, 'Comment must be less than 1000 characters'),
			})
		),
		defaultValues: { content: comment.content },
	})

	const updateMutation = useMutation({
		mutationFn: async (values: { content: string }) => {
			const existingPhraseIds = new Set(
				(existingLinks ?? []).map(({ link }) => link.phrase_id)
			)
			const newPhraseIds = new Set(selectedPhraseIds)

			// Update the comment text
			const { data: updatedComment, error: commentError } = await supabase
				.from('request_comment')
				.update({ content: values.content })
				.eq('id', comment.id)
				.select()
				.single()
			if (commentError) throw commentError

			// Delete removed phrase links
			const toDelete = [...existingPhraseIds].filter(
				(id) => !newPhraseIds.has(id)
			)
			if (toDelete.length > 0) {
				const { error: deleteError } = await supabase
					.from('comment_phrase_link')
					.delete()
					.eq('comment_id', comment.id)
					.in('phrase_id', toDelete)
				if (deleteError) throw deleteError
			}

			// Insert new phrase links
			const toInsert = [...newPhraseIds].filter(
				(id) => !existingPhraseIds.has(id)
			)
			let insertedLinks: CommentPhraseLinkType[] = []
			if (toInsert.length > 0) {
				const { data: newLinks, error: insertError } = await supabase
					.from('comment_phrase_link')
					.insert(
						toInsert.map((phraseId) => ({
							comment_id: comment.id,
							request_id: comment.request_id,
							phrase_id: phraseId,
						}))
					)
					.select()
				if (insertError) throw insertError
				insertedLinks = newLinks ?? []
			}

			return { updatedComment, toDelete, insertedLinks }
		},
		onSuccess: ({ updatedComment, toDelete, insertedLinks }) => {
			commentsCollection.utils.writeUpdate(
				RequestCommentSchema.parse(updatedComment)
			)

			// Remove deleted phrase links from collection
			const linksById = new Map(
				(existingLinks ?? []).map(({ link }) => [link.phrase_id, link])
			)
			for (const phraseId of toDelete) {
				const link = linksById.get(phraseId)
				if (link) commentPhraseLinksCollection.utils.writeDelete(link.id)
			}

			// Add new phrase links to collection
			for (const link of insertedLinks) {
				commentPhraseLinksCollection.utils.writeInsert(
					CommentPhraseLinkSchema.parse(link)
				)
			}

			toastSuccess('Comment updated!')
			onClose()
		},
		onError: (error: Error) => {
			toastError(`Failed to update comment: ${error.message}`)
			console.log('Error', error)
		},
	})

	const hasCards = selectedPhraseIds.length > 0
	const isReply = !!comment.parent_comment_id

	return (
		<Form {...form}>
			<form
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))}
				className="space-y-4"
			>
				{!isReply && hasCards && (
					<div>
						<p className="mb-2 text-sm font-medium">
							Attached flashcards ({selectedPhraseIds.length}/4)
						</p>
						<div className="flex flex-wrap items-start gap-2">
							{selectedPhraseIds.map((pid) => (
								<div key={pid} className="relative shrink-0">
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="bg-background/80 border-border absolute end-2 top-2 z-10 h-6 w-6 rounded-full backdrop-blur-sm"
										onClick={() =>
											setSelectedPhraseIds(
												selectedPhraseIds.filter((id) => id !== pid)
											)
										}
									>
										<X />
									</Button>
									<PhraseTinyCard pid={pid} nonInteractive />
								</div>
							))}
							{selectedPhraseIds.length < 4 && (
								<SelectPhrasesForComment
									lang={lang}
									selectedPhraseIds={selectedPhraseIds}
									onSelectionChange={setSelectedPhraseIds}
									cardShape
								/>
							)}
						</div>
					</div>
				)}

				{!isReply && !hasCards && (
					<SelectPhrasesForComment
						lang={lang}
						selectedPhraseIds={selectedPhraseIds}
						onSelectionChange={setSelectedPhraseIds}
						className="w-full"
					/>
				)}

				<FormField
					control={form.control}
					name="content"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="sr-only">Edit your comment</FormLabel>
							{hasCards && (
								<p className="text-muted-foreground text-xs">
									Caption is optional — the flashcard speaks for itself.
								</p>
							)}
							<p className="text-muted-foreground text-xs">
								Comments support markdown like `&gt;` for blockquote,{' '}
								<em>_italics_</em>, <strong>**bold**</strong>
							</p>
							<FormControl>
								<Textarea
									data-testid="edit-comment-content-input"
									placeholder={
										hasCards ?
											'Add a caption... (optional)'
										:	'Share your thoughts...'
									}
									rows={4}
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
						data-testid="save-comment-button"
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
