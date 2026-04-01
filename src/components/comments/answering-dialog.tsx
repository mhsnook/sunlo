import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
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
import { cn } from '@/lib/utils'
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
import { useLanguagePhrasesSearch } from '@/features/phrases/hooks'
import { useRequest } from '@/features/requests/hooks'
import { PhraseTinyCard } from '@/components/cards/phrase-tiny-card'
import { UidPermalink } from '@/components/card-pieces/user-permalink'
import { Markdown } from '@/components/my-markdown'
import { InlinePhraseCreator } from '@/components/phrases/inline-phrase-creator'

interface AnsweringDialogProps {
	requestId: uuid
	lang: string
	answering: 'search' | 'comment' | undefined
	/** True when search is a sub-step launched from the comment form */
	attaching: boolean
	selectedPhraseIds: Array<uuid>
	onSelectionChange: (ids: Array<uuid>) => void
}

export function AnsweringDialog({
	requestId,
	lang,
	answering,
	attaching,
	selectedPhraseIds,
	onSelectionChange,
}: AnsweringDialogProps) {
	const navigate = useNavigate()

	// ?answering=search OR ?answering=comment&attaching → show search panel
	// ?answering=comment (no attaching) → show comment form
	const showSearch =
		answering === 'search' || (answering === 'comment' && attaching)
	const showComment = answering === 'comment' && !attaching

	const close = () => {
		if (answering === 'comment' && attaching) {
			// Return to comment form: drop attaching, keep answering=comment
			void navigate({
				to: '.',
				search: (prev: Record<string, unknown>) => {
					const { attaching: _, ...rest } = prev
					return rest
				},
			})
		} else {
			// Close dialog entirely
			void navigate({
				to: '.',
				search: (prev: Record<string, unknown>) => {
					const { answering: _, attaching: __, ...rest } = prev
					return rest
				},
			})
		}
	}

	return (
		<Dialog
			open={!!answering}
			onOpenChange={(open) => {
				if (!open) close()
			}}
		>
			<AuthenticatedDialogContent
				authTitle="Login to Comment"
				authMessage="You need to be logged in to join the conversation."
				className="@container grid max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0"
				data-testid="answering-dialog"
			>
				<div className="flex-none p-4 pb-3 sm:p-6 sm:pb-4">
					<DialogTitle className="sr-only">
						{showSearch ? 'Select a flashcard' : 'Add a comment'}
					</DialogTitle>
					<DialogDescription className="sr-only">
						{showSearch ?
							'Search and select a flashcard to attach to your answer'
						:	'Share your thoughts or suggest a flashcard answer'}
					</DialogDescription>
					<RequestContext id={requestId} />
				</div>
				<Separator />

				{/* Both panels stay mounted so state (search text, textarea) survives toggling */}
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
							onSelectionChange(ids)
							// After selecting, always land on the comment form (drop attaching)
							void navigate({
								to: '.',
								search: (prev: Record<string, unknown>) => {
									const { attaching: _, ...rest } = prev
									return { ...rest, answering: 'comment' }
								},
							})
						}}
					/>
				</div>

				<div
					className={cn('overflow-y-auto p-4 sm:p-6', !showComment && 'hidden')}
				>
					<CommentForm
						requestId={requestId}
						selectedPhraseIds={selectedPhraseIds}
						onRemovePhrase={(id) =>
							onSelectionChange(selectedPhraseIds.filter((p) => p !== id))
						}
						onClose={close}
					/>
				</div>
			</AuthenticatedDialogContent>
		</Dialog>
	)
}

// ---- Sub-components ----

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

const CommentFormSchema = z.object({
	content: z.string().max(1000, 'Comment must be less than 1000 characters'),
})

type CommentFormInputs = z.infer<typeof CommentFormSchema>

function CommentForm({
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
					p_parent_comment_id: null,
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
			commentsCollection.utils.writeInsert(
				RequestCommentSchema.parse(data.request_comment)
			)
			commentUpvotesCollection.utils.writeInsert({
				comment_id: data.request_comment.id,
			})
			data.comment_phrase_links?.forEach((link) => {
				commentPhraseLinksCollection.utils.writeInsert(
					CommentPhraseLinkSchema.parse(link)
				)
			})
			form.reset()
			toastSuccess('Comment posted!')
			onClose()
		},
		onError: (error: Error) => {
			toastError(`Failed to post comment: ${error.message}`)
		},
	})

	const hasCards = selectedPhraseIds.length > 0

	return (
		<Form {...form}>
			<form
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				onSubmit={form.handleSubmit((data) =>
					createCommentMutation.mutate(data)
				)}
				className="space-y-4"
			>
				{hasCards ?
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
					>
						<Paperclip className="h-4 w-4" />
						Suggest a flashcard
					</Link>
				}

				<FormField
					control={form.control}
					name="content"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="sr-only">Add a comment</FormLabel>
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
									data-testid="comment-content-input"
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

				<Button
					type="submit"
					data-testid="post-comment-button"
					disabled={createCommentMutation.isPending}
				>
					{createCommentMutation.isPending ?
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
