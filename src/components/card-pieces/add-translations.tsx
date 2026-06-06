import { useMemo, useRef, useState } from 'react'
import * as z from 'zod'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { Pencil, Check, X, Archive, Undo2 } from 'lucide-react'

import {
	type PhraseFullType,
	type TranslationType,
} from '@/features/phrases/schemas'
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
import { phraseTranslationsCollection } from '@/features/phrases/collections'
import { usePreferredTranslationLang } from '@/features/deck/hooks'
import { useUserId } from '@/lib/use-auth'
import { Input } from '@/components/ui/input'
import { useAppForm } from '@/components/form'

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

export function AddTranslationsDialog({
	phrase,
	...props
}: ButtonProps & {
	phrase: PhraseFullType
}) {
	const userId = useUserId()
	const preferredTranslationLang = usePreferredTranslationLang(phrase.lang)
	const closeRef = useRef<HTMLButtonElement | null>(null)
	const close = () => closeRef.current?.click()

	const addTranslation = ({
		translation_lang,
		translation_text,
	}: AddTranslationsType) => {
		const now = new Date().toISOString()
		const tx = phraseTranslationsCollection.insert({
			id: crypto.randomUUID(),
			phrase_id: phrase.id,
			lang: translation_lang,
			text: translation_text,
			added_by: userId,
			archived: false,
			created_at: now,
			updated_at: now,
		})
		close()
		form.reset()
		tx.isPersisted.promise.then(
			() => toastSuccess(`Translation added for ${phrase.text}`),
			(err: Error) => {
				toastError(err.message)
				console.log(`Rolled back add-translation`, err)
			}
		)
	}

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
		onSubmit: ({ value }) => {
			addTranslation(value)
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
						{(phrase.translations ?? []).map((trans) => (
							<TranslationListItem key={trans.id} trans={trans} />
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

// Component for displaying a translation with edit/delete options
function TranslationListItem({ trans }: { trans: TranslationType }) {
	const userId = useUserId()
	const isOwner = trans.added_by === userId
	const [isEditing, setIsEditing] = useState(false)
	const [editText, setEditText] = useState(trans.text)

	const handleSave = () => {
		const trimmed = editText.trim()
		if (!trimmed || trimmed === trans.text) {
			setIsEditing(false)
			return
		}
		const tx = phraseTranslationsCollection.update(trans.id, (draft) => {
			draft.text = trimmed
		})
		setIsEditing(false)
		tx.isPersisted.promise.then(
			() => toastSuccess('Translation updated'),
			(err: Error) => {
				toastError(err.message)
				console.log(`Rolled back translation update`, err)
			}
		)
	}

	const toggleArchive = () => {
		const wasArchived = trans.archived
		const tx = phraseTranslationsCollection.update(trans.id, (draft) => {
			draft.archived = !wasArchived
		})
		tx.isPersisted.promise.then(
			() => toastSuccess(`Translation ${wasArchived ? 'un' : ''}archived`),
			(err: Error) => {
				toastError(err.message)
				console.log(`Rolled back translation archive toggle`, err)
			}
		)
	}

	const handleCancel = () => {
		setEditText(trans.text)
		setIsEditing(false)
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
								onClick={toggleArchive}
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
