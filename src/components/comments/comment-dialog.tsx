import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { createOptimisticAction, eq } from '@tanstack/db'
import { useLiveQuery } from '@tanstack/react-db'
import * as z from 'zod'
import { Paperclip, Plus, Search, X } from 'lucide-react'
import { toastError, toastSuccess } from '@/components/ui/sonner'

import type { uuid } from '@/types/main'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { AuthenticatedDialogContent } from '@/components/ui/authenticated-dialog'
import { Separator } from '@/components/ui/separator'
import supabase from '@/lib/supabase-client'
import { useUserId } from '@/lib/use-auth'
import { cn } from '@/lib/utils'
import {
	commentPhraseLinksCollection,
	commentUpvotesCollection,
	commentsCollection,
} from '@/features/requests/collections'
import {
	CommentPhraseLinkSchema,
	type CommentPhraseLinkType,
	RequestCommentSchema,
	type RequestCommentType,
} from '@/features/requests/schemas'
import { useLanguagePhrasesSearch } from '@/features/phrases/hooks'
import { useRequest } from '@/features/requests/hooks'
import { PhraseTinyCard } from '@/components/cards/phrase-tiny-card'
import { UidPermalink } from '@/components/card-pieces/user-permalink'
import { Markdown } from '@/components/my-markdown'
import { InlinePhraseCreator } from '@/components/phrases/inline-phrase-creator'
import { useAppForm } from '@/components/form'

type CommentDialogMode =
	| { kind: 'new'; attaching: boolean }
	| { kind: 'quicksearch' }
	| { kind: 'edit'; commentId: uuid; attaching: boolean }

/**
 * Derives the dialog mode from URL search params.
 * Returns undefined when no comment dialog should be open.
 */
export function deriveCommentDialogMode(search: {
	focus?: string
	mode?: string
	attaching?: boolean
}): CommentDialogMode | undefined {
	if (search.mode === 'search') return { kind: 'quicksearch' }
	if (search.mode === 'comment')
		return { kind: 'new', attaching: !!search.attaching }
	if (search.mode === 'edit' && search.focus) {
		return {
			kind: 'edit',
			commentId: search.focus,
			attaching: !!search.attaching,
		}
	}
	return undefined
}

interface CommentDialogProps {
	requestId: uuid
	lang: string
	mode: CommentDialogMode | undefined
	/** Only needed for edit mode — the comment being edited */
	editComment?: RequestCommentType
}

export function CommentDialog({
	requestId,
	lang,
	mode,
	editComment,
}: CommentDialogProps) {
	const navigate = useNavigate()

	const isOpen = !!mode
	// Is the reply-editing case? (parent_comment_id !== null) — handled by ReplyDialog, not here
	const isReply = editComment?.parent_comment_id != null

	const showSearch =
		mode?.kind === 'quicksearch' ||
		((mode?.kind === 'new' || mode?.kind === 'edit') && mode.attaching)
	const showForm = !showSearch && isOpen

	const [selectedPhraseIds, setSelectedPhraseIds] = useState<Array<uuid>>([])

	const { data: existingLinks } = useCommentPhraseLinks(
		mode?.kind === 'edit' ? mode.commentId : undefined
	)
	const initialized = useRef(false)
	useEffect(() => {
		if (mode?.kind === 'edit' && !initialized.current && existingLinks) {
			setSelectedPhraseIds(existingLinks.map((link) => link.phrase_id))
			initialized.current = true
		}
	}, [existingLinks, mode?.kind])

	const prevOpen = useRef(isOpen)
	useEffect(() => {
		if (prevOpen.current && !isOpen) {
			setSelectedPhraseIds([])
			initialized.current = false
		}
		prevOpen.current = isOpen
	}, [isOpen])

	const close = () => {
		if (mode?.kind === 'quicksearch') {
			void navigate({
				to: '.',
				search: (prev: Record<string, unknown>) => {
					const { mode: _, attaching: __, ...rest } = prev
					return rest
				},
			})
		} else if (
			(mode?.kind === 'new' || mode?.kind === 'edit') &&
			mode.attaching
		) {
			void navigate({
				to: '.',
				search: (prev: Record<string, unknown>) => {
					const { attaching: _, ...rest } = prev
					return rest
				},
			})
		} else {
			void navigate({
				to: '.',
				search: (prev: Record<string, unknown>) => {
					const { mode: _, attaching: __, ...rest } = prev
					return rest
				},
			})
		}
	}

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
				className="@container grid max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0"
				data-testid="comment-dialog"
			>
				<div className="flex-none p-4 pb-3 sm:p-6 sm:pb-4">
					<DialogTitle className="sr-only">
						{showSearch
							? 'Select a flashcard'
							: mode?.kind === 'edit'
								? 'Edit Comment'
								: 'Add a comment'}
					</DialogTitle>
					<DialogDescription className="sr-only">
						{showSearch
							? 'Search and select a flashcard to attach to your answer'
							: 'Share your thoughts or suggest a flashcard answer'}
					</DialogDescription>
					<RequestContext id={requestId} />
				</div>
				<Separator />

				{/* Both panels stay mounted so state survives toggling */}
				<div
					className={cn(
						'grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden',
						!showSearch && 'hidden'
					)}
				>
					<PhrasePickerPanel
						lang={lang}
						selectedPhraseIds={selectedPhraseIds}
						onPhraseSelected={(ids) => {
							setSelectedPhraseIds(ids)
							// After selecting, land on the form
							if (mode?.kind === 'quicksearch') {
								void navigate({
									to: '.',
									search: (prev: Record<string, unknown>) => ({
										...prev,
										mode: 'comment' as const,
									}),
								})
							} else {
								void navigate({
									to: '.',
									search: (prev: Record<string, unknown>) => {
										const { attaching: _, ...rest } = prev
										return rest
									},
								})
							}
						}}
					/>
				</div>

				<div
					className={cn('overflow-y-auto p-4 sm:p-6', !showForm && 'hidden')}
				>
					{mode?.kind === 'edit' && editComment ? (
						<EditCommentForm
							comment={editComment}
							isReply={isReply}
							selectedPhraseIds={selectedPhraseIds}
							existingLinks={existingLinks}
							onRemovePhrase={(id) =>
								setSelectedPhraseIds(selectedPhraseIds.filter((p) => p !== id))
							}
							onClose={close}
						/>
					) : (
						<NewCommentForm
							requestId={requestId}
							selectedPhraseIds={selectedPhraseIds}
							onRemovePhrase={(id) =>
								setSelectedPhraseIds(selectedPhraseIds.filter((p) => p !== id))
							}
							onClose={close}
						/>
					)}
				</div>
			</AuthenticatedDialogContent>
		</Dialog>
	)
}

function RequestContext({ id }: { id: uuid }) {
	const { data, isLoading } = useRequest(id)
	if (isLoading || !data) return null
	return (
		<div>
			<UidPermalink uid={data.requester_uid} nonInteractive />
			<div className="mt-2 text-sm">
				<Markdown>{data.prompt}</Markdown>
			</div>
		</div>
	)
}

function PhrasePickerPanel({
	lang,
	selectedPhraseIds,
	onPhraseSelected,
}: {
	lang: string
	selectedPhraseIds: Array<uuid>
	onPhraseSelected: (ids: Array<uuid>) => void
}) {
	const [searchText, setSearchText] = useState('')
	const [showCreateForm, setShowCreateForm] = useState(false)
	const { data: filteredPhrases } = useLanguagePhrasesSearch(lang, searchText)

	const addPhrase = (phraseId: uuid) => {
		onPhraseSelected([...selectedPhraseIds, phraseId])
	}

	return (
		<>
			{!showCreateForm && (
				<div className="flex-none border-b p-4 pb-3 sm:px-6 sm:py-4">
					<div className="relative">
						<Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
						<Input
							type="text"
							placeholder="Search phrases..."
							value={searchText}
							data-testid="phrase-search-input"
							onChange={(e) => setSearchText(e.target.value)}
							className="ps-9"
						/>
					</div>
				</div>
			)}
			<div className="min-h-0 overflow-hidden">
				<ScrollArea className="h-full">
					<div className="flex flex-col gap-3 p-4 sm:p-6">
						{showCreateForm ? (
							<InlinePhraseCreator
								lang={lang}
								onPhraseCreated={(id) => {
									addPhrase(id)
									setShowCreateForm(false)
								}}
								onCancel={() => setShowCreateForm(false)}
							/>
						) : (
							<>
								<Button
									type="button"
									variant="dashed-w-full"
									data-testid="create-new-phrase-button"
									onClick={() => setShowCreateForm(true)}
								>
									<Plus className="h-4 w-4" />
									Create new phrase
								</Button>
								{!filteredPhrases?.length ? (
									<p className="text-muted-foreground py-8 text-center">
										No phrases found
									</p>
								) : (
									filteredPhrases
										.filter((phrase) => !selectedPhraseIds.includes(phrase.id))
										.map((phrase) => (
											<button
												key={phrase.id}
												type="button"
												data-testid="phrase-picker-item"
												data-key={phrase.id}
												onClick={() => addPhrase(phrase.id)}
												className="hover:bg-muted/50 w-full cursor-pointer rounded-lg border p-3 pb-1 text-start transition-colors"
											>
												<PhraseTinyCard pid={phrase.id} nonInteractive />
											</button>
										))
								)}
							</>
						)}
					</div>
				</ScrollArea>
			</div>
		</>
	)
}

function AttachedPhraseCards({
	selectedPhraseIds,
	onRemovePhrase,
}: {
	selectedPhraseIds: Array<uuid>
	onRemovePhrase: (id: uuid) => void
}) {
	const hasCards = selectedPhraseIds.length > 0

	return hasCards ? (
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
							data-testid="remove-phrase-button"
							onClick={() => onRemovePhrase(pid)}
						>
							<X />
						</Button>
						<PhraseTinyCard pid={pid} nonInteractive />
					</div>
				))}
				{selectedPhraseIds.length < 4 && (
					<Link
						to="."
						search={(prev: Record<string, unknown>) => ({
							...prev,
							attaching: true,
						})}
						className="border-lc-2 border-chroma-lo border-hue-primary text-muted-foreground hover:bg-lc-1 hover:bg-chroma-lo hover:bg-hue-primary hover:text-lc-7 hover:text-chroma-mid hover:text-hue-primary hover:border-lc-4 hover:border-chroma-mlo hover:border-hue-primary flex h-30 min-w-50 basis-50 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed transition-colors"
					>
						<Plus className="h-6 w-6" />
					</Link>
				)}
			</div>
		</div>
	) : (
		<Link
			to="."
			search={(prev: Record<string, unknown>) => ({
				...prev,
				attaching: true,
			})}
			className={cn(buttonVariants({ variant: 'soft', size: 'sm' }), 'w-full')}
			data-testid="attach-phrase-button"
		>
			<Paperclip className="h-4 w-4" />
			Suggest a flashcard
		</Link>
	)
}

export function MarkdownHint() {
	return (
		<p className="text-muted-foreground text-xs">
			Supports markdown like `&gt;` for blockquote, <em>_italics_</em>,{' '}
			<strong>**bold**</strong>
		</p>
	)
}

const CommentFormSchema = z.object({
	content: z.string().max(1000, 'Comment must be less than 1000 characters'),
})

type CreateCommentInput = {
	commentId: uuid
	requestId: uuid
	uid: uuid
	content: string
	parentCommentId: uuid | null
	phraseLinks: Array<{ linkId: uuid; phraseId: uuid }>
}

export const createComment = createOptimisticAction<CreateCommentInput>({
	onMutate: ({
		commentId,
		requestId,
		uid,
		content,
		parentCommentId,
		phraseLinks,
	}) => {
		const now = new Date().toISOString()
		commentsCollection.insert({
			id: commentId,
			request_id: requestId,
			parent_comment_id: parentCommentId,
			uid,
			content,
			created_at: now,
			updated_at: now,
			// DB trigger auto-upvotes the author, so the count starts at 1.
			upvote_count: 1,
		})
		commentUpvotesCollection.insert({ comment_id: commentId })
		for (const { linkId, phraseId } of phraseLinks) {
			commentPhraseLinksCollection.insert({
				id: linkId,
				comment_id: commentId,
				request_id: requestId,
				phrase_id: phraseId,
				uid,
				created_at: now,
			})
		}
	},
	mutationFn: async ({ requestId, content, parentCommentId, phraseLinks }) => {
		const { data, error } = await supabase.rpc('create_comment_with_phrases', {
			p_request_id: requestId,
			p_content: content,
			p_parent_comment_id: parentCommentId ?? undefined,
			p_phrase_ids: phraseLinks.map((l) => l.phraseId),
		})
		if (error) throw error
		const result = data as {
			request_comment: RequestCommentType
			comment_phrase_links: CommentPhraseLinkType[]
		}
		const comment = RequestCommentSchema.parse(result.request_comment)
		commentsCollection.utils.writeInsert(comment)
		commentUpvotesCollection.utils.writeInsert({ comment_id: comment.id })
		for (const link of result.comment_phrase_links) {
			commentPhraseLinksCollection.utils.writeInsert(
				CommentPhraseLinkSchema.parse(link)
			)
		}
	},
})

type UpdateCommentInput = {
	commentId: uuid
	requestId: uuid
	uid: uuid
	content: string
	linksToDelete: Array<{ linkId: uuid; phraseId: uuid }>
	linksToInsert: Array<{ linkId: uuid; phraseId: uuid }>
}

const updateCommentWithLinks = createOptimisticAction<UpdateCommentInput>({
	onMutate: ({
		commentId,
		requestId,
		uid,
		content,
		linksToDelete,
		linksToInsert,
	}) => {
		const now = new Date().toISOString()
		commentsCollection.update(commentId, (draft) => {
			draft.content = content
			draft.updated_at = now
		})
		for (const link of linksToDelete) {
			commentPhraseLinksCollection.delete(link.linkId)
		}
		for (const link of linksToInsert) {
			commentPhraseLinksCollection.insert({
				id: link.linkId,
				comment_id: commentId,
				request_id: requestId,
				phrase_id: link.phraseId,
				uid,
				created_at: now,
			})
		}
	},
	mutationFn: async ({
		commentId,
		content,
		linksToDelete,
		linksToInsert,
		requestId,
	}) => {
		const { data: updatedComment } = await supabase
			.from('request_comment')
			.update({ content })
			.eq('id', commentId)
			.select()
			.single()
			.throwOnError()
		commentsCollection.utils.writeUpdate(
			RequestCommentSchema.parse(updatedComment)
		)

		if (linksToDelete.length > 0) {
			await supabase
				.from('comment_phrase_link')
				.delete()
				.eq('comment_id', commentId)
				.in(
					'phrase_id',
					linksToDelete.map((l) => l.phraseId)
				)
				.throwOnError()
			for (const link of linksToDelete) {
				commentPhraseLinksCollection.utils.writeDelete(link.linkId)
			}
		}

		if (linksToInsert.length > 0) {
			const { data: newLinks } = await supabase
				.from('comment_phrase_link')
				.insert(
					linksToInsert.map((l) => ({
						comment_id: commentId,
						request_id: requestId,
						phrase_id: l.phraseId,
					}))
				)
				.select()
				.throwOnError()
			for (const link of newLinks ?? []) {
				commentPhraseLinksCollection.utils.writeInsert(
					CommentPhraseLinkSchema.parse(link)
				)
			}
		}
	},
})

function NewCommentForm({
	requestId,
	selectedPhraseIds,
	onRemovePhrase,
	onClose,
}: {
	requestId: uuid
	selectedPhraseIds: Array<uuid>
	onRemovePhrase: (id: uuid) => void
	onClose: () => void
}) {
	const userId = useUserId()

	const form = useAppForm({
		defaultValues: { content: '' },
		validators: { onChange: CommentFormSchema },
		onSubmit: async ({ value, formApi }) => {
			if (!userId) return
			try {
				await Promise.all([
					commentsCollection.preload(),
					commentUpvotesCollection.preload(),
					commentPhraseLinksCollection.preload(),
				])
				const commentId = crypto.randomUUID()
				const phraseLinks = selectedPhraseIds.map((phraseId) => ({
					linkId: crypto.randomUUID(),
					phraseId,
				}))
				const tx = createComment({
					commentId,
					requestId,
					uid: userId,
					content: value.content,
					parentCommentId: null,
					phraseLinks,
				})
				await tx.isPersisted.promise
				toastSuccess('Comment posted!')
				formApi.reset()
				onClose()
			} catch (err) {
				const message = err instanceof Error ? err.message : 'unknown error'
				toastError(`Failed to post comment: ${message}`)
				console.error(err)
			}
		},
	})

	const hasCards = selectedPhraseIds.length > 0
	const submitLabel =
		selectedPhraseIds.length > 1
			? 'Post Answers'
			: selectedPhraseIds.length === 1
				? 'Post Answer'
				: 'Post Comment'

	return (
		<form
			data-testid="new-comment-form"
			noValidate
			className="space-y-4"
			onSubmit={(e) => {
				e.preventDefault()
				e.stopPropagation()
				void form.handleSubmit()
			}}
		>
			<AttachedPhraseCards
				selectedPhraseIds={selectedPhraseIds}
				onRemovePhrase={onRemovePhrase}
			/>

			<MarkdownHint />
			<form.AppField name="content">
				{(field) => (
					<field.TextareaInput
						placeholder={
							hasCards
								? 'Add some context (optional)'
								: 'Share your thoughts...'
						}
						rows={4}
					/>
				)}
			</form.AppField>

			<form.AppForm>
				<form.SubmitButton pendingText="Posting...">
					{submitLabel}
				</form.SubmitButton>
			</form.AppForm>
		</form>
	)
}

function EditCommentForm({
	comment,
	isReply,
	selectedPhraseIds,
	existingLinks,
	onRemovePhrase,
	onClose,
}: {
	comment: RequestCommentType
	isReply: boolean
	selectedPhraseIds: Array<uuid>
	existingLinks: CommentPhraseLinkType[] | undefined
	onRemovePhrase: (id: uuid) => void
	onClose: () => void
}) {
	const form = useAppForm({
		defaultValues: { content: comment.content },
		validators: { onChange: CommentFormSchema },
		onSubmit: async ({ value }) => {
			const existingPhraseIds = new Set(
				(existingLinks ?? []).map((link) => link.phrase_id)
			)
			const newPhraseIds = new Set(selectedPhraseIds)

			const linksToDelete = (existingLinks ?? [])
				.filter((l) => !newPhraseIds.has(l.phrase_id))
				.map((l) => ({ linkId: l.id, phraseId: l.phrase_id }))

			const linksToInsert = [...newPhraseIds]
				.filter((id) => !existingPhraseIds.has(id))
				.map((phraseId) => ({
					linkId: crypto.randomUUID(),
					phraseId,
				}))

			try {
				await Promise.all([
					commentsCollection.preload(),
					commentPhraseLinksCollection.preload(),
				])
				const tx = updateCommentWithLinks({
					commentId: comment.id,
					requestId: comment.request_id,
					uid: comment.uid,
					content: value.content,
					linksToDelete,
					linksToInsert,
				})
				await tx.isPersisted.promise
				toastSuccess('Comment updated!')
				onClose()
			} catch (err) {
				const message = err instanceof Error ? err.message : 'unknown error'
				toastError(`Failed to update comment: ${message}`)
				console.error(err)
			}
		},
	})

	const hasCards = selectedPhraseIds.length > 0

	return (
		<form
			data-testid="edit-comment-form"
			noValidate
			className="space-y-4"
			onSubmit={(e) => {
				e.preventDefault()
				e.stopPropagation()
				void form.handleSubmit()
			}}
		>
			{!isReply && (
				<AttachedPhraseCards
					selectedPhraseIds={selectedPhraseIds}
					onRemovePhrase={onRemovePhrase}
				/>
			)}

			<MarkdownHint />
			<form.AppField name="content">
				{(field) => (
					<field.TextareaInput
						placeholder={
							!isReply && hasCards
								? 'Add some context (optional)'
								: 'Share your thoughts...'
						}
						rows={4}
					/>
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

function useCommentPhraseLinks(commentId: uuid | undefined) {
	return useLiveQuery(
		(q) =>
			commentId
				? q
						.from({ link: commentPhraseLinksCollection })
						.where(({ link }) => eq(link.comment_id, commentId))
				: q
						.from({ link: commentPhraseLinksCollection })
						.where(({ link }) => eq(link.comment_id, '')),
		[commentId]
	)
}
