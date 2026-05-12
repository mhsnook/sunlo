import { useMemo, useRef, useState } from 'react'
import * as z from 'zod'
import { createOptimisticAction } from '@tanstack/db'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { Pencil, Check, X, Archive, Undo2 } from 'lucide-react'

import {
	TranslationSchema,
	type PhraseFullType,
	type TranslationType,
} from '@/features/phrases/schemas'
import supabase from '@/lib/supabase-client'
import {
	Dialog,
	DialogTrigger,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '@/components/ui/dialog'
import { AuthenticatedDialogContent } from '@/components/ui/authenticated-dialog'
import { Button, ButtonProps } from '@/components/ui/button'
import TranslationLanguageField from '@/components/fields/translation-language-field'
import { phrasesCollection } from '@/features/phrases/collections'
import { usePreferredTranslationLang } from '@/features/deck/hooks'
import { useUserId } from '@/lib/use-auth'
import { Input } from '@/components/ui/input'
import { useAppForm } from '@/components/form'
import type { uuid } from '@/types/main'

const createAddTranslationsSchema = (phraseLang: string) =>
	z.object({
		translation_lang: z
			.string()
			.length(3)
			.refine((val) => val !== phraseLang, {
				message:
					'Translation language cannot be the same as the phrase language',
			}),
		translation_text: z.string().min(1),
	})
type AddTranslationsType = z.infer<
	ReturnType<typeof createAddTranslationsSchema>
>

type AddTranslationInput = {
	phraseId: uuid
	tempId: uuid
	userId: uuid
	translation_lang: string
	translation_text: string
}

const addTranslationAction = createOptimisticAction<AddTranslationInput>({
	onMutate: ({
		phraseId,
		tempId,
		userId,
		translation_lang,
		translation_text,
	}) => {
		const now = new Date().toISOString()
		phrasesCollection.update(phraseId, (draft) => {
			// PhraseFullSchema uses z.preprocess for translations/tags which makes
			// the draft's input type unknown; cast back to the output type.
			const d = draft as unknown as PhraseFullType
			d.translations.unshift({
				id: tempId,
				created_at: now,
				text: translation_text,
				lang: translation_lang,
				phrase_id: phraseId,
				added_by: userId,
				archived: false,
				updated_at: null,
			})
		})
	},
	mutationFn: async ({
		phraseId,
		tempId,
		translation_lang,
		translation_text,
	}) => {
		const { data } = await supabase
			.from('phrase_translation')
			.insert({
				lang: translation_lang,
				text: translation_text,
				phrase_id: phraseId,
			})
			.select()
			.single()
			.throwOnError()
		const newTrans = TranslationSchema.parse(data)
		const current = phrasesCollection.get(phraseId)
		if (!current) return
		// current.translations is optimistic-merged: contains our temp entry.
		// Build the synced state with the server row in place of the temp.
		phrasesCollection.utils.writeUpdate({
			id: phraseId,
			translations: [
				newTrans,
				...current.translations.filter((t) => t.id !== tempId),
			],
		})
	},
})

type UpdateTranslationInput = {
	phraseId: uuid
	translationId: uuid
	newText: string
}

const updateTranslationAction = createOptimisticAction<UpdateTranslationInput>({
	onMutate: ({ phraseId, translationId, newText }) => {
		phrasesCollection.update(phraseId, (draft) => {
			const d = draft as unknown as PhraseFullType
			const t = d.translations.find((x) => x.id === translationId)
			if (t) t.text = newText
		})
	},
	mutationFn: async ({ phraseId, translationId, newText }) => {
		const { data } = await supabase
			.from('phrase_translation')
			.update({ text: newText })
			.eq('id', translationId)
			.select()
			.single()
			.throwOnError()
		const updated = TranslationSchema.parse(data)
		const current = phrasesCollection.get(phraseId)
		if (!current) return
		phrasesCollection.utils.writeUpdate({
			id: phraseId,
			translations: current.translations.map((t) =>
				t.id === translationId ? updated : t
			),
		})
	},
})

type ToggleArchiveTranslationInput = {
	phraseId: uuid
	translationId: uuid
	nextArchived: boolean
}

const toggleArchiveTranslationAction =
	createOptimisticAction<ToggleArchiveTranslationInput>({
		onMutate: ({ phraseId, translationId, nextArchived }) => {
			phrasesCollection.update(phraseId, (draft) => {
				const d = draft as unknown as PhraseFullType
				const t = d.translations.find((x) => x.id === translationId)
				if (t) t.archived = nextArchived
			})
		},
		mutationFn: async ({ phraseId, translationId, nextArchived }) => {
			const { data } = await supabase
				.from('phrase_translation')
				.update({ archived: nextArchived })
				.eq('id', translationId)
				.select()
				.single()
				.throwOnError()
			const updated = TranslationSchema.parse(data)
			const current = phrasesCollection.get(phraseId)
			if (!current) return
			phrasesCollection.utils.writeUpdate({
				id: phraseId,
				translations: current.translations.map((t) =>
					t.id === translationId ? updated : t
				),
			})
		},
	})

export function AddTranslationsDialog({
	phrase,
	...props
}: ButtonProps & {
	phrase: PhraseFullType
}) {
	const preferredTranslationLang = usePreferredTranslationLang(phrase.lang)
	const userId = useUserId()
	const closeRef = useRef<HTMLButtonElement | null>(null)
	const close = () => closeRef.current?.click()

	const schema = useMemo(
		() => createAddTranslationsSchema(phrase.lang),
		[phrase.lang]
	)
	const form = useAppForm({
		defaultValues: {
			translation_text: '',
			translation_lang: preferredTranslationLang,
		},
		validators: { onChange: schema },
		onSubmit: async ({ value }: { value: AddTranslationsType }) => {
			if (!userId) return
			try {
				const tempId = crypto.randomUUID()
				const tx = addTranslationAction({
					phraseId: phrase.id,
					tempId,
					userId,
					translation_lang: value.translation_lang,
					translation_text: value.translation_text,
				})
				await tx.isPersisted.promise
				close()
				form.reset()
				toastSuccess(`Translation added for ${phrase.text}`)
			} catch (err) {
				const message = err instanceof Error ? err.message : 'unknown error'
				toastError(message)
				console.error('Add translation rolled back:', err)
			}
		},
	})

	return (
		<Dialog>
			<DialogTrigger asChild ref={closeRef}>
				<Button
					{...props}
					size="icon"
					data-testid="add-translations-trigger"
					aria-label="Manage translations"
				>
					<Pencil />
				</Button>
			</DialogTrigger>
			<AuthenticatedDialogContent
				authTitle="Login to Add Translations"
				authMessage="You need to be logged in to add translations to phrases."
				className="w-[92%] max-w-106"
				data-testid="add-translations-dialog"
			>
				<DialogHeader className="text-start">
					<DialogTitle>Manage translations</DialogTitle>
					<DialogDescription className="space-y-2 text-start">
						For the phrase &ldquo;{phrase.text}&rdquo;
					</DialogDescription>
				</DialogHeader>
				<div className="text-muted-foreground space-y-2 text-sm">
					<p>Please check to make sure you're not entering a duplicate.</p>
					<ol className="space-y-2">
						{phrase.translations.map((trans) => (
							<TranslationListItem
								key={trans.id}
								trans={trans}
								phrase={phrase}
							/>
						))}
					</ol>
				</div>
				<form
					data-testid="add-translation-form"
					noValidate
					onSubmit={(e) => {
						e.preventDefault()
						e.stopPropagation()
						void form.handleSubmit()
					}}
				>
					<div className="mb-4 flex flex-col gap-4">
						<form.AppField name="translation_lang">
							{() => <TranslationLanguageField phraseLang={phrase.lang} />}
						</form.AppField>
						<form.AppField name="translation_text">
							{(field) => (
								<field.TextareaInput
									label="Translation text"
									placeholder="Translation text"
								/>
							)}
						</form.AppField>
					</div>
					<DialogFooter className="flex flex-row justify-between">
						<Button type="button" variant="neutral" onClick={close}>
							Cancel
						</Button>
						<form.AppForm>
							<form.SubmitButton variant="default">
								Add translation
							</form.SubmitButton>
						</form.AppForm>
					</DialogFooter>
				</form>
			</AuthenticatedDialogContent>
		</Dialog>
	)
}

function TranslationListItem({
	trans,
	phrase,
}: {
	trans: TranslationType
	phrase: PhraseFullType
}) {
	const userId = useUserId()
	const isOwner = trans.added_by === userId
	const [isEditing, setIsEditing] = useState(false)
	const [editText, setEditText] = useState(trans.text)

	const handleSave = () => {
		const newText = editText.trim()
		if (!newText || newText === trans.text) {
			setIsEditing(false)
			return
		}
		const tx = updateTranslationAction({
			phraseId: phrase.id,
			translationId: trans.id,
			newText,
		})
		tx.isPersisted.promise.then(
			() => {
				setIsEditing(false)
				toastSuccess('Translation updated')
			},
			(err: unknown) => {
				const message = err instanceof Error ? err.message : 'unknown error'
				toastError(message)
				console.error('Update translation rolled back:', err)
			}
		)
	}

	const handleCancel = () => {
		setEditText(trans.text)
		setIsEditing(false)
	}

	const handleToggleArchive = () => {
		const nextArchived = !trans.archived
		const tx = toggleArchiveTranslationAction({
			phraseId: phrase.id,
			translationId: trans.id,
			nextArchived,
		})
		tx.isPersisted.promise.then(
			() => toastSuccess(`Translation ${nextArchived ? '' : 'un'}archived`),
			(err: unknown) => {
				const message = err instanceof Error ? err.message : 'unknown error'
				toastError(message)
				console.error('Archive translation rolled back:', err)
			}
		)
	}

	return (
		<li className="flex items-center gap-2">
			<span className="shrink-0 rounded-md bg-gray-200 px-2 py-1 text-xs text-gray-700">
				{trans.lang}
			</span>
			{isEditing ? (
				<>
					<Input
						value={editText}
						onChange={(e) => setEditText(e.target.value)}
						className="h-7 flex-1 text-sm"
					/>
					<Button
						size="icon"
						variant="ghost"
						className="size-6"
						onClick={handleSave}
					>
						<Check className="size-3" />
					</Button>
					<Button
						size="icon"
						variant="ghost"
						className="size-6"
						onClick={handleCancel}
					>
						<X className="size-3" />
					</Button>
				</>
			) : (
				<>
					<span
						className={`flex-1 ${trans.archived ? 'text-muted-foreground line-through' : ''}`}
					>
						{trans.text}
					</span>
					{isOwner && (
						<>
							{trans.archived ? null : (
								<Button
									size="icon"
									variant="ghost"
									className="size-6"
									onClick={() => setIsEditing(true)}
								>
									<Pencil className="size-3" />
								</Button>
							)}
							<Button
								size="icon"
								variant="ghost"
								className="size-6"
								onClick={handleToggleArchive}
							>
								{trans.archived ? (
									<Undo2 className="size-3" />
								) : (
									<Archive className="text-destructive hover:text-destructive size-3" />
								)}
							</Button>
						</>
					)}
				</>
			)}
		</li>
	)
}
