import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Languages, X } from 'lucide-react'
import { toastError, toastSuccess } from '@/components/ui/sonner'

import type { uuid } from '@/types/main'
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
import { MarkdownHint } from './comment-dialog'
import supabase from '@/lib/supabase-client'
import {
	phraseCommentsCollection,
	phraseCommentUpvotesCollection,
	commentTranslationLinksCollection,
} from '@/features/comments/collections'
import {
	PhraseCommentSchema,
	CommentTranslationLinkSchema,
	type PhraseCommentType,
	type CommentTranslationLinkType,
} from '@/features/comments/schemas'
import {
	TranslationSchema,
	type TranslationType,
} from '@/features/phrases/schemas'
import { phrasesCollection } from '@/features/phrases/collections'
import { UidPermalink } from '@/components/card-pieces/user-permalink'
import { usePhrase } from '@/hooks/composite-phrase'
import { LangBadge } from '@/components/ui/badge'
import { SelectOneOfYourLanguages } from '@/components/fields/select-one-of-your-languages'
import { usePreferredTranslationLang } from '@/features/deck/hooks'

// ---------------------------------------------------------------------------
// URL state types
// ---------------------------------------------------------------------------

type PhraseCommentDialogMode =
	| { kind: 'new' }
	| { kind: 'edit'; commentId: uuid }

/**
 * Derives the dialog mode from URL search params.
 * Returns undefined when no phrase comment dialog should be open.
 */
export function derivePhraseCommentDialogMode(search: {
	focus?: string
	mode?: string
}): PhraseCommentDialogMode | undefined {
	if (search.mode === 'comment') return { kind: 'new' }
	if (search.mode === 'edit' && search.focus) {
		return { kind: 'edit', commentId: search.focus }
	}
	return undefined
}

// ---------------------------------------------------------------------------
// PhraseCommentDialog
// ---------------------------------------------------------------------------

interface PhraseCommentDialogProps {
	phraseId: uuid
	phraseLang: string
	mode: PhraseCommentDialogMode | undefined
	editComment?: PhraseCommentType
}

export function PhraseCommentDialog({
	phraseId,
	phraseLang,
	mode,
	editComment,
}: PhraseCommentDialogProps) {
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
				data-testid="phrase-comment-dialog"
			>
				<DialogTitle className="sr-only">
					{mode?.kind === 'edit' ? 'Edit Comment' : 'Discuss this phrase'}
				</DialogTitle>
				<DialogDescription className="sr-only">
					{mode?.kind === 'edit' ?
						'Edit your comment'
					:	'Share your thoughts or suggest a translation'}
				</DialogDescription>
				<PhraseContext pid={phraseId} />
				<Separator />
				{mode?.kind === 'edit' && editComment ?
					<EditPhraseCommentForm comment={editComment} onClose={close} />
				:	<NewPhraseCommentForm
						phraseId={phraseId}
						phraseLang={phraseLang}
						onClose={close}
					/>
				}
			</AuthenticatedDialogContent>
		</Dialog>
	)
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function PhraseContext({ pid }: { pid: uuid }) {
	const { data, status } = usePhrase(pid)
	if (status === 'pending' || status === 'not-found' || !data) return null
	return (
		<div>
			<UidPermalink uid={data.added_by!} nonInteractive />
			<p className="mt-2 text-lg font-medium">&ldquo;{data.text}&rdquo;</p>
		</div>
	)
}

// ---------------------------------------------------------------------------
// New comment form
// ---------------------------------------------------------------------------

const CommentFormSchema = z.object({
	content: z.string().max(1000, 'Comment must be less than 1000 characters'),
})

interface TranslationDraft {
	lang: string
	text: string
	literal?: string
}

function NewPhraseCommentForm({
	phraseId,
	phraseLang,
	onClose,
}: {
	phraseId: uuid
	phraseLang: string
	onClose: () => void
}) {
	const [translation, setTranslation] = useState<TranslationDraft | null>(null)
	const [showTranslationForm, setShowTranslationForm] = useState(false)

	const form = useForm<{ content: string }>({
		resolver: zodResolver(CommentFormSchema),
		defaultValues: { content: '' },
	})

	const createMutation = useMutation({
		mutationFn: async (values: { content: string }) => {
			const translations = translation ? [translation] : []
			// @ts-expect-error -- RPC exists after migration; regenerate types with `pnpm run types`
			const { data, error } = await supabase.rpc('create_phrase_comment', {
				p_phrase_id: phraseId,
				p_content: values.content,
				p_parent_comment_id: null,
				p_translations: translations,
			})
			if (error) throw error
			return data as {
				phrase_comment: PhraseCommentType
				comment_translation_links: Array<CommentTranslationLinkType>
				translations: Array<TranslationType>
			}
		},
		onSuccess: (data) => {
			phraseCommentsCollection.utils.writeInsert(
				PhraseCommentSchema.parse(data.phrase_comment)
			)
			phraseCommentUpvotesCollection.utils.writeInsert({
				comment_id: data.phrase_comment.id,
			})
			data.comment_translation_links?.forEach((link) => {
				commentTranslationLinksCollection.utils.writeInsert(
					CommentTranslationLinkSchema.parse(link)
				)
			})
			// Update phrases collection so translations show immediately
			data.translations?.forEach((t) => {
				const parsed = TranslationSchema.parse(t)
				// Trigger a refetch of the phrase to pick up new translations
				void phrasesCollection.preload({ force: true }).then(() => void parsed)
			})

			form.reset()
			setTranslation(null)
			toastSuccess('Comment posted!')
			onClose()
		},
		onError: (error: Error) => {
			toastError(`Failed to post comment: ${error.message}`)
			console.log('Error', error)
		},
	})

	const hasTranslation = !!translation

	return (
		<Form {...form}>
			<form
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
				className="space-y-4"
			>
				{/* Attached translation */}
				{hasTranslation && (
					<div>
						<p className="mb-2 text-sm font-medium">Translation</p>
						<div className="bg-muted flex items-center gap-2 rounded-lg p-2">
							<LangBadge lang={translation.lang} />
							<span className="flex-1 text-sm">{translation.text}</span>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-6 w-6"
								onClick={() => setTranslation(null)}
							>
								<X className="h-3 w-3" />
							</Button>
						</div>
					</div>
				)}

				{/* Inline translation form */}
				{showTranslationForm && (
					<AddTranslationInline
						phraseLang={phraseLang}
						onAdd={(draft) => {
							setTranslation(draft)
							setShowTranslationForm(false)
						}}
						onCancel={() => setShowTranslationForm(false)}
					/>
				)}

				<FormField
					control={form.control}
					name="content"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="sr-only">Add a comment</FormLabel>
							<MarkdownHint />
							<FormControl>
								<Textarea
									data-testid="phrase-comment-content-input"
									placeholder={
										hasTranslation ?
											'Add some context (optional)'
										:	'Share your thoughts or discuss this phrase...'
									}
									rows={4}
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="flex flex-col gap-2 @xs:flex-row @xs:items-center @xs:justify-between">
					<Button
						type="submit"
						data-testid="submit-phrase-comment-button"
						disabled={createMutation.isPending}
					>
						{createMutation.isPending ?
							'Posting...'
						: hasTranslation ?
							'Post Translation'
						:	'Post Comment'}
					</Button>

					{!hasTranslation && !showTranslationForm && (
						<Button
							type="button"
							variant="soft"
							size="sm"
							onClick={() => setShowTranslationForm(true)}
						>
							<Languages className="me-1 h-4 w-4" />
							Suggest a translation
						</Button>
					)}
				</div>
			</form>
		</Form>
	)
}

// ---------------------------------------------------------------------------
// Edit comment form
// ---------------------------------------------------------------------------

function EditPhraseCommentForm({
	comment,
	onClose,
}: {
	comment: PhraseCommentType
	onClose: () => void
}) {
	const form = useForm<{ content: string }>({
		resolver: zodResolver(CommentFormSchema),
		defaultValues: { content: comment.content },
	})

	const updateMutation = useMutation({
		mutationFn: async (values: { content: string }) => {
			// @ts-expect-error -- table exists after migration; regenerate types with `pnpm run types`
			const { data, error } = await supabase
				.from('phrase_comment')
				.update({ content: values.content })
				.eq('id', comment.id)
				.select()
				.single()
			if (error) throw error
			return data
		},
		onSuccess: (data) => {
			phraseCommentsCollection.utils.writeUpdate(
				PhraseCommentSchema.parse(data)
			)
			toastSuccess('Comment updated!')
			onClose()
		},
		onError: (error: Error) => {
			toastError(`Failed to update comment: ${error.message}`)
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
							<FormLabel className="sr-only">Edit your comment</FormLabel>
							<MarkdownHint />
							<FormControl>
								<Textarea
									data-testid="edit-phrase-comment-input"
									placeholder="Share your thoughts..."
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
						data-testid="save-phrase-comment-button"
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
// Inline translation form
// ---------------------------------------------------------------------------

function AddTranslationInline({
	phraseLang,
	onAdd,
	onCancel,
}: {
	phraseLang: string
	onAdd: (draft: TranslationDraft) => void
	onCancel: () => void
}) {
	const preferredLang = usePreferredTranslationLang(phraseLang)
	const [lang, setLang] = useState(preferredLang)
	const [text, setText] = useState('')

	const handleAdd = () => {
		if (text.trim() && lang && lang !== phraseLang) {
			onAdd({ lang, text: text.trim() })
		}
	}

	return (
		<div className="bg-muted/50 space-y-3 rounded-lg border p-3">
			<p className="text-sm font-medium">Add a translation</p>
			<div className="flex flex-col gap-2">
				<SelectOneOfYourLanguages
					value={lang}
					setValue={setLang}
					disabled={[phraseLang]}
				/>
				<Textarea
					placeholder="Translation text"
					value={text}
					onChange={(e) => setText(e.target.value)}
					rows={2}
				/>
			</div>
			<div className="flex gap-2">
				<Button
					type="button"
					size="sm"
					onClick={handleAdd}
					disabled={!text.trim() || !lang || lang === phraseLang}
				>
					Add
				</Button>
				<Button type="button" variant="neutral" size="sm" onClick={onCancel}>
					Cancel
				</Button>
			</div>
		</div>
	)
}
