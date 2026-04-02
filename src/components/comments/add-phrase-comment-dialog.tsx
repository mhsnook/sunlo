import { ReactNode, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { Languages, X } from 'lucide-react'

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
import {
	Dialog,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { AuthenticatedDialogContent } from '@/components/ui/authenticated-dialog'
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
import { TinySelfAvatar, UidPermalink } from '../card-pieces/user-permalink'
import { Separator } from '../ui/separator'
import { SelectOneOfYourLanguages } from '@/components/fields/select-one-of-your-languages'
import { LangBadge } from '@/components/ui/badge'
import { usePhrase } from '@/hooks/composite-phrase'
import { usePreferredTranslationLang } from '@/features/deck/hooks'

interface TranslationDraft {
	lang: string
	text: string
	literal?: string
}

function PhraseDisplayOnly({ pid }: { pid: uuid }) {
	const { data, status } = usePhrase(pid)
	if (status === 'pending' || status === 'not-found' || !data) return null
	return (
		<div>
			<UidPermalink uid={data.added_by!} timeValue={data.created_at} />
			<p className="mt-2 text-lg font-medium">&ldquo;{data.text}&rdquo;</p>
		</div>
	)
}

export function AddPhraseCommentDialog({
	phraseId,
	phraseLang,
	parentCommentId,
	children,
}: {
	phraseId: uuid
	phraseLang: string
	parentCommentId?: uuid
	children?: ReactNode
}) {
	const [open, setOpen] = useState(false)
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{children ?? (
				<DialogTrigger
					data-testid="add-phrase-comment-button"
					className="@group flex w-full grow cursor-pointer flex-row items-center justify-between gap-2"
				>
					<TinySelfAvatar className="grow-o shrink-0" />
					<p className="bg-card/50 hover:bg-card/50 text-muted-foreground/70 w-full rounded-xl border px-2 py-1.5 pe-6 text-start text-sm shadow-xs inset-shadow-sm">
						{parentCommentId ? 'Type your reply here' : 'Discuss this phrase'}
						...
					</p>
				</DialogTrigger>
			)}
			<AuthenticatedDialogContent
				authTitle="Login to Comment"
				authMessage="You need to be logged in to join the conversation."
				className="@container max-h-[90dvh] overflow-y-auto p-4 sm:p-6"
				data-testid="add-phrase-comment-dialog"
			>
				<DialogTitle className="sr-only">
					{parentCommentId ? 'Reply to comment' : 'Discuss this phrase'}
				</DialogTitle>
				<DialogDescription className="sr-only">
					{parentCommentId ?
						'Write a reply to this comment'
					:	'Share your thoughts or suggest translations'}
				</DialogDescription>
				{!parentCommentId && <PhraseDisplayOnly pid={phraseId} />}
				<Separator />
				<NewPhraseCommentForm
					phraseId={phraseId}
					phraseLang={phraseLang}
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

function NewPhraseCommentForm({
	phraseId,
	phraseLang,
	parentCommentId,
	onSuccess,
}: {
	phraseId: uuid
	phraseLang: string
	parentCommentId?: uuid
	onSuccess: () => void
}) {
	const [translations, setTranslations] = useState<Array<TranslationDraft>>([])
	const [showTranslationForm, setShowTranslationForm] = useState(false)
	const isReply = !!parentCommentId

	const form = useForm<CommentFormInputs>({
		resolver: zodResolver(CommentFormSchema),
		defaultValues: { content: '' },
	})

	const createCommentMutation = useMutation({
		mutationFn: async (values: CommentFormInputs) => {
			// @ts-expect-error -- RPC exists after migration; regenerate types with `pnpm run types`
			const { data, error } = await supabase.rpc('create_phrase_comment', {
				p_phrase_id: phraseId,
				p_content: values.content,
				p_parent_comment_id: parentCommentId,
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

			if (data.comment_translation_links?.length) {
				data.comment_translation_links.forEach((link) => {
					commentTranslationLinksCollection.utils.writeInsert(
						CommentTranslationLinkSchema.parse(link)
					)
				})
			}

			if (data.translations?.length) {
				data.translations.forEach((t) => {
					const parsed = TranslationSchema.parse(t)
					void parsed
				})
			}

			form.reset()
			setTranslations([])
			toastSuccess(isReply ? 'Reply posted!' : 'Comment posted!')
			onSuccess()
		},
		onError: (error: Error) => {
			toastError(
				`Failed to post ${isReply ? 'reply' : 'comment'}: ${error.message}`
			)
		},
	})

	const handleRemoveTranslation = (index: number) => {
		setTranslations((prev) => prev.filter((_, i) => i !== index))
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
									data-testid="phrase-comment-content-input"
									placeholder={
										isReply ? 'Write a reply...' : (
											'Share your thoughts or discuss this phrase...'
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

				{/* Attached translations */}
				{translations.length > 0 && (
					<div className="mb-0">
						<p className="text-sm font-medium">
							Attached translations ({translations.length}/4)
						</p>
						<div className="mt-2 space-y-2">
							{translations.map((t, i) => (
								<div
									key={i}
									className="bg-muted flex items-center gap-2 rounded-lg p-2"
								>
									<LangBadge lang={t.lang} />
									<span className="flex-1 text-sm">{t.text}</span>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="h-6 w-6"
										onClick={() => handleRemoveTranslation(i)}
									>
										<X className="h-3 w-3" />
									</Button>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Inline translation form */}
				{showTranslationForm && (
					<AddTranslationInline
						phraseLang={phraseLang}
						onAdd={(draft) => {
							setTranslations((prev) => [...prev, draft])
							setShowTranslationForm(false)
						}}
						onCancel={() => setShowTranslationForm(false)}
					/>
				)}

				<div className="flex flex-col gap-2 @xs:flex-row @xs:items-center @xs:justify-between">
					<Button
						type="submit"
						data-testid="submit-phrase-comment-button"
						disabled={createCommentMutation.isPending}
					>
						{createCommentMutation.isPending ?
							'Posting...'
						: isReply ?
							'Post Reply'
						:	'Post Comment'}
					</Button>

					{translations.length < 4 && !showTranslationForm && (
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
