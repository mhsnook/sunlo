import { CSSProperties, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import {
	useFieldArray,
	useForm,
	Controller,
	type Control,
	type UseFormRegister,
	type FieldErrors,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'

import supabase from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import ErrorLabel from '@/components/fields/error-label'
import { ShowAndLogError } from '@/components/errors'
import languages from '@/lib/languages'
import { usePreferredTranslationLang } from '@/hooks/use-deck'
import { useUserId } from '@/lib/use-auth'
import { Separator } from '@/components/ui/separator'
import { SelectOneOfYourLanguages } from '@/components/fields/select-one-of-your-languages'
import { CardResultSimple } from '@/components/cards/card-result-simple'
import { PhraseFullSchema } from '@/lib/schemas'
import { phrasesCollection } from '@/lib/collections'
import { Tables } from '@/types/supabase'
import { uuid } from '@/types/main'
import { WithPhrase } from '@/components/with-phrase'
import { useInvalidateFeed } from '@/hooks/use-feed'

type BulkAddPhrasesResponse = {
	phrases: Tables<'phrase'>[]
	translations: Tables<'phrase_translation'>[]
}

const TranslationSchema = z.object({
	lang: z.string().length(3, 'Please select a language'),
	text: z.string().min(1, 'Please enter a translation'),
})

const PhraseWithTranslationsSchema = z.object({
	phrase_text: z.string().min(1, 'Please enter a phrase'),
	translations: z
		.array(TranslationSchema)
		.min(1, 'Please add at least one translation'),
})

const BulkAddPhrasesSchema = z.object({
	phrases: z
		.array(PhraseWithTranslationsSchema)
		.min(1, 'Please add at least one phrase'),
})

type BulkAddPhrasesFormValues = z.infer<typeof BulkAddPhrasesSchema>

export const Route = createFileRoute('/_user/learn/$lang/bulk-add')({
	component: BulkAddPhrasesPage,
	beforeLoad: ({ params: { lang } }) => ({
		titleBar: {
			title: `Bulk Add ${languages[lang]} Phrases`,
		},
	}),
})

const style = { viewTransitionName: `main-area` } as CSSProperties

function BulkAddPhrasesPage() {
	const { lang } = Route.useParams()
	const userId = useUserId()
	const preferredTranslationLang = usePreferredTranslationLang(lang)

	const [successfullyAddedPhrases, setSuccessfullyAddedPhrases] = useState<
		Array<uuid>
	>([])

	const {
		control,
		handleSubmit,
		register,
		reset,
		formState: { errors, isDirty, isSubmitting },
	} = useForm<BulkAddPhrasesFormValues>({
		resolver: zodResolver(BulkAddPhrasesSchema),
		defaultValues: {
			phrases: [
				{
					phrase_text: '',
					translations: [{ lang: preferredTranslationLang, text: '' }],
				},
			],
		},
	})

	const invalidateFeed = useInvalidateFeed()

	const { fields, append, remove } = useFieldArray({
		control,
		name: 'phrases',
	})

	const bulkAddMutation = useMutation({
		mutationFn: async (values: BulkAddPhrasesFormValues) => {
			console.log(`Attempting mutation`, { values })
			const payload = {
				p_lang: lang,
				p_phrases: values.phrases,
				p_user_id: userId,
			}
			const { data, error } = await supabase.rpc('bulk_add_phrases', payload)
			console.log(`After mutation`, { values, data, error })

			if (error) throw error
			return data as BulkAddPhrasesResponse | null
		},
		onSuccess: (data: BulkAddPhrasesResponse | null) => {
			if (!data) {
				toast('No data came back from the database :-/')
				return
			}
			const phrasesToInsert = data.phrases.map((p) =>
				PhraseFullSchema.parse({
					...p,
					translations: data.translations.filter((t) => t.phrase_id === p.id),
				})
			)
			phrasesToInsert.forEach((p) => phrasesCollection.utils.writeInsert(p))
			invalidateFeed(lang)
			setSuccessfullyAddedPhrases((prev) => [
				...phrasesToInsert.map((p) => p.id),
				...prev,
			])
			// Reset the form for the next batch
			reset({
				phrases: [getEmptyPhrase(preferredTranslationLang)],
			})
			toast.success(`${data.phrases.length} phrases added successfully!`)
		},
		onError: (error) => {
			toast.error(`Error adding phrases: ${error.message}`)
		},
	})

	return (
		<main style={style}>
			<Card>
				<CardHeader>
					<CardTitle>
						Bulk Add Phrases to the {languages[lang]} Library
					</CardTitle>
					<CardDescription>
						Add multiple phrases and their translations at once.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						noValidate
						// eslint-disable-next-line @typescript-eslint/no-misused-promises
						onSubmit={handleSubmit((data) => bulkAddMutation.mutate(data))}
						className="space-y-6"
					>
						<div className="space-y-4">
							{fields.map((phraseField, phraseIndex) => (
								<PhraseEntry
									key={phraseField.id}
									phraseIndex={phraseIndex}
									control={control}
									register={register}
									removePhrase={remove}
									errors={errors}
									disableRemove={fields.length === 1}
								/>
							))}
						</div>

						<div className="flex justify-between">
							<Button
								type="button"
								variant="outline"
								// oxlint-disable-next-line jsx-no-new-function-as-prop
								onClick={() => append(getEmptyPhrase(preferredTranslationLang))}
							>
								<Plus className="mr-2 size-4" /> Add Another Phrase
							</Button>
							<Button
								type="submit"
								disabled={!isDirty || isSubmitting || bulkAddMutation.isPending}
							>
								Save All Phrases
							</Button>
						</div>
						<ShowAndLogError
							error={bulkAddMutation.error}
							text="There was an error submitting your phrases"
						/>
					</form>
					{successfullyAddedPhrases.length > 0 && (
						<div className="my-6">
							<Separator className="my-6" />
							<h3 className="mb-4 text-lg font-semibold">Successfully Added</h3>
							<div className="space-y-2">
								{successfullyAddedPhrases.map((pid) => (
									<WithPhrase
										key={pid}
										pid={pid}
										Component={CardResultSimple}
									/>
								))}
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</main>
	)
}

const getEmptyPhrase = (lang: string = 'eng') => ({
	phrase_text: '',
	translations: [{ lang, text: '' }],
})

function PhraseEntry({
	phraseIndex,
	control,
	register,
	removePhrase,
	errors,
	disableRemove = false,
}: {
	phraseIndex: number
	control: Control<BulkAddPhrasesFormValues>
	register: UseFormRegister<BulkAddPhrasesFormValues>
	removePhrase: (index: number) => void
	errors: FieldErrors<BulkAddPhrasesFormValues>
	disableRemove: boolean
}) {
	const { lang } = Route.useParams()
	const preferredTranslationLang = usePreferredTranslationLang(lang)
	const {
		fields: translationFields,
		append: appendTranslation,
		remove: removeTranslation,
	} = useFieldArray({
		control,
		name: `phrases.${phraseIndex}.translations`,
	})

	return (
		<Card className="space-y-4 p-4">
			<div className="flex items-start justify-between gap-2">
				<div className="flex-1 space-y-2">
					<div className="flex items-center justify-between">
						<Label htmlFor={`phrases.${phraseIndex}.phrase_text`}>
							Phrase in {languages[lang]}
						</Label>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							// oxlint-disable-next-line jsx-no-new-function-as-prop
							onClick={() => removePhrase(phraseIndex)}
							disabled={disableRemove}
						>
							<Trash2 className="text-destructive size-4" />
						</Button>
					</div>
					<Textarea
						id={`phrases.${phraseIndex}.phrase_text`}
						{...register(`phrases.${phraseIndex}.phrase_text`)}
						placeholder="Enter the phrase to learn"
					/>
					<ErrorLabel error={errors.phrases?.[phraseIndex]?.phrase_text} />
				</div>
			</div>

			<div className="ml-4 space-y-3 border-s-2 border-dashed pl-4">
				<Label>Translations</Label>
				{translationFields.map((translationField, translationIndex) => (
					<div
						key={translationField.id}
						className="bg-background/50 flex flex-col gap-2 rounded p-2"
					>
						<div className="flex w-full flex-row items-center justify-between gap-2">
							<Controller
								control={control}
								name={`phrases.${phraseIndex}.translations.${translationIndex}.lang`}
								// oxlint-disable-next-line jsx-no-new-function-as-prop
								render={({ field }) => (
									<SelectOneOfYourLanguages
										value={field.value}
										setValue={field.onChange}
										className="w-40"
									/>
								)}
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								// oxlint-disable-next-line jsx-no-new-function-as-prop
								onClick={() => removeTranslation(translationIndex)}
								disabled={translationFields.length === 1}
							>
								<Trash2 className="text-destructive size-4" />
							</Button>
						</div>
						<div className="flex flex-1 flex-col">
							<Textarea
								{...register(
									`phrases.${phraseIndex}.translations.${translationIndex}.text`
								)}
								placeholder="Translation text"
							/>
							<div className="ms-2">
								<ErrorLabel
									error={
										errors.phrases?.[phraseIndex]?.translations?.[
											translationIndex
										]?.text
									}
								/>
								<ErrorLabel
									error={
										errors.phrases?.[phraseIndex]?.translations?.[
											translationIndex
										]?.lang
									}
								/>
							</div>
						</div>
					</div>
				))}
				<ErrorLabel error={errors.phrases?.[phraseIndex]?.translations?.root} />
			</div>
			<Button
				type="button"
				variant="outline"
				// oxlint-disable-next-line jsx-no-new-function-as-prop
				onClick={() =>
					appendTranslation({
						lang: preferredTranslationLang,
						text: '',
					})
				}
			>
				<Plus className="mr-2 size-4" /> Add Translation
			</Button>
			<ErrorLabel error={errors.phrases?.[phraseIndex]?.root} />
		</Card>
	)
}
