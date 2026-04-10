import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { eq, useLiveQuery } from '@tanstack/react-db'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Paperclip, Plus, Search, X } from 'lucide-react'
import { toastError, toastSuccess } from '@/components/ui/sonner'

import type { uuid } from '@/types/main'
import { Button, buttonVariants } from '@/components/ui/button'
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { AuthenticatedDialogContent } from '@/components/ui/authenticated-dialog'
import { Separator } from '@/components/ui/separator'
import supabase from '@/lib/supabase-client'
import { safeWrite } from '@/lib/collections/safe-write'
import { cn } from '@/lib/utils'
import {
	commentPhraseLinksCollection,
	commentUpvotesCollection,
	commentsCollection,
} from '@/features/comments/collections'
import {
	CommentPhraseLinkSchema,
	RequestCommentSchema,
	type CommentPhraseLinkType,
	type RequestCommentType,
} from '@/features/comments/schemas'
import { useLanguagePhrasesSearch } from '@/features/phrases/hooks'
import { useRequest } from '@/features/requests/hooks'
import { PhraseTinyCard } from '@/components/cards/phrase-tiny-card'
import { UidPermalink } from '@/components/card-pieces/user-permalink'
import { Markdown } from '@/components/my-markdown'
import { InlinePhraseCreator } from '@/components/phrases/inline-phrase-creator'

// ---------------------------------------------------------------------------
// URL state types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// CommentDialog — handles new comments, editing, and quick-add search
// ---------------------------------------------------------------------------

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

	// Phrase selection state — lives here (form value, not URL)
	const [selectedPhraseIds, setSelectedPhraseIds] = useState<Array<uuid>>([])

	// For edit mode, initialize from existing links
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

	// Reset when dialog closes
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
			// 1c: dismiss entirely
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
			// 1b: return to form (drop attaching)
			void navigate({
				to: '.',
				search: (prev: Record<string, unknown>) => {
					const { attaching: _, ...rest } = prev
					return rest
				},
			})
		} else {
			// 1a: close dialog, keep focus for highlight
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
						{showSearch ?
							'Select a flashcard'
						: mode?.kind === 'edit' ?
							'Edit Comment'
						:	'Add a comment'}
					</DialogTitle>
					<DialogDescription className="sr-only">
						{showSearch ?
							'Search and select a flashcard to attach to your answer'
						:	'Share your thoughts or suggest a flashcard answer'}
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
								// 1c → 1a: transition from quick-search to comment form
								void navigate({
									to: '.',
									search: (prev: Record<string, unknown>) => ({
										...prev,
										mode: 'comment' as const,
									}),
								})
							} else {
								// 1b → 1a: drop attaching
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
					{mode?.kind === 'edit' && editComment ?
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
					:	<NewCommentForm
							requestId={requestId}
							selectedPhraseIds={selectedPhraseIds}
							onRemovePhrase={(id) =>
								setSelectedPhraseIds(selectedPhraseIds.filter((p) => p !== id))
							}
							onClose={close}
						/>
					}
				</div>
			</AuthenticatedDialogContent>
		</Dialog>
	)
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

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
	const { data: rawPhrases } = useLanguagePhrasesSearch(lang, searchText)
	// Deduplicate phrases by ID (phrasesFull can return duplicates from card joins)
	const filteredPhrases =
		rawPhrases ?
			[...new Map(rawPhrases.map((p) => [p.id, p])).values()]
		:	rawPhrases

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
						{showCreateForm ?
							<InlinePhraseCreator
								lang={lang}
								onPhraseCreated={(id) => {
									addPhrase(id)
									setShowCreateForm(false)
								}}
								onCancel={() => setShowCreateForm(false)}
							/>
						:	<>
								<Button
									type="button"
									variant="dashed-w-full"
									onClick={() => setShowCreateForm(true)}
								>
									<Plus className="h-4 w-4" />
									Create new phrase
								</Button>
								{!filteredPhrases?.length ?
									<p className="text-muted-foreground py-8 text-center">
										No phrases found
									</p>
								:	filteredPhrases
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
								}
							</>
						}
					</div>
				</ScrollArea>
			</div>
		</>
	)
}

// ---------------------------------------------------------------------------
// Phrase cards section (shared between new and edit forms)
// ---------------------------------------------------------------------------

function AttachedPhraseCards({
	selectedPhraseIds,
	onRemovePhrase,
}: {
	selectedPhraseIds: Array<uuid>
	onRemovePhrase: (id: uuid) => void
}) {
	const hasCards = selectedPhraseIds.length > 0

	return hasCards ?
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
							className="border-2-lo-primary text-muted-foreground hover:bg-1-lo-primary hover:text-7-mid-primary hover:border-4-mlo-primary flex h-30 min-w-50 basis-50 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed transition-colors"
						>
							<Plus className="h-6 w-6" />
						</Link>
					)}
				</div>
			</div>
		:	<Link
				to="."
				search={(prev: Record<string, unknown>) => ({
					...prev,
					attaching: true,
				})}
				className={cn(
					buttonVariants({ variant: 'soft', size: 'sm' }),
					'w-full'
				)}
				data-testid="attach-phrase-button"
			>
				<Paperclip className="h-4 w-4" />
				Suggest a flashcard
			</Link>
}

export function MarkdownHint() {
	return (
		<p className="text-muted-foreground text-xs">
			Supports markdown like `&gt;` for blockquote, <em>_italics_</em>,{' '}
			<strong>**bold**</strong>
		</p>
	)
}

// ---------------------------------------------------------------------------
// New comment form (1a new)
// ---------------------------------------------------------------------------

const CommentFormSchema = z.object({
	content: z.string().max(1000, 'Comment must be less than 1000 characters'),
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
	const form = useForm<{ content: string }>({
		resolver: zodResolver(CommentFormSchema),
		defaultValues: { content: '' },
	})

	const createMutation = useMutation({
		mutationFn: async (values: { content: string }) => {
			const { data, error } = await supabase.rpc(
				'create_comment_with_phrases',
				{
					p_request_id: requestId,
					p_content: values.content,
					p_parent_comment_id: undefined,
					p_phrase_ids: selectedPhraseIds,
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
			form.reset()
			toastSuccess('Comment posted!')
			onClose()
		},
		onError: (error: Error) => {
			toastError(`Failed to post comment: ${error.message}`)
			console.log('Error', error)
		},
	})

	const hasCards = selectedPhraseIds.length > 0

	return (
		<Form {...form}>
			<form
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
				className="space-y-4"
			>
				<AttachedPhraseCards
					selectedPhraseIds={selectedPhraseIds}
					onRemovePhrase={onRemovePhrase}
				/>

				<FormField
					control={form.control}
					name="content"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="sr-only">Add a comment</FormLabel>
							<MarkdownHint />
							<FormControl>
								<Textarea
									data-testid="comment-content-input"
									placeholder={
										hasCards ?
											'Add some context (optional)'
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

				<Button
					type="submit"
					data-testid="post-comment-button"
					disabled={createMutation.isPending}
				>
					{createMutation.isPending ?
						'Posting...'
					: selectedPhraseIds.length > 1 ?
						'Post Answers'
					: selectedPhraseIds.length === 1 ?
						'Post Answer'
					:	'Post Comment'}
				</Button>
			</form>
		</Form>
	)
}

// ---------------------------------------------------------------------------
// Edit comment form (1a edit)
// ---------------------------------------------------------------------------

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
	const form = useForm<{ content: string }>({
		resolver: zodResolver(CommentFormSchema),
		defaultValues: { content: comment.content },
	})

	const updateMutation = useMutation({
		mutationFn: async (values: { content: string }) => {
			const existingPhraseIds = new Set(
				(existingLinks ?? []).map((link) => link.phrase_id)
			)
			const newPhraseIds = new Set(selectedPhraseIds)

			const { data: updatedComment, error: commentError } = await supabase
				.from('request_comment')
				.update({ content: values.content })
				.eq('id', comment.id)
				.select()
				.single()
			if (commentError) throw commentError

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
		onSuccess: async ({ updatedComment, toDelete, insertedLinks }) => {
			const parsed = RequestCommentSchema.parse(updatedComment)
			await safeWrite(
				() => commentsCollection.preload(),
				() => commentsCollection.utils.writeUpdate(parsed)
			)

			const linksById = new Map(
				(existingLinks ?? []).map((link) => [link.phrase_id, link])
			)
			const parsedLinks = insertedLinks.map((l) =>
				CommentPhraseLinkSchema.parse(l)
			)
			await safeWrite(
				() => commentPhraseLinksCollection.preload(),
				() => {
					for (const phraseId of toDelete) {
						const link = linksById.get(phraseId)
						if (link) commentPhraseLinksCollection.utils.writeDelete(link.id)
					}
					for (const link of parsedLinks) {
						commentPhraseLinksCollection.utils.writeInsert(link)
					}
				}
			)

			toastSuccess('Comment updated!')
			onClose()
		},
		onError: (error: Error) => {
			toastError(`Failed to update comment: ${error.message}`)
			console.log('Error', error)
		},
	})

	const hasCards = selectedPhraseIds.length > 0

	return (
		<Form {...form}>
			<form
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))}
				className="space-y-4"
			>
				{!isReply && (
					<AttachedPhraseCards
						selectedPhraseIds={selectedPhraseIds}
						onRemovePhrase={onRemovePhrase}
					/>
				)}

				<FormField
					control={form.control}
					name="content"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="sr-only">Edit your comment</FormLabel>
							<MarkdownHint />
							<FormControl>
								<Textarea
									data-testid="edit-comment-content-input"
									placeholder={
										!isReply && hasCards ?
											'Add some context (optional)'
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

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useCommentPhraseLinks(commentId: uuid | undefined) {
	return useLiveQuery(
		(q) =>
			commentId ?
				q
					.from({ link: commentPhraseLinksCollection })
					.where(({ link }) => eq(link.comment_id, commentId))
			:	q
					.from({ link: commentPhraseLinksCollection })
					.where(({ link }) => eq(link.comment_id, '')),
		[commentId]
	)
}
