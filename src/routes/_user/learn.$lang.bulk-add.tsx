import { createFileRoute } from '@tanstack/react-router'
import { useFieldArray, useForm, Controller, FieldError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

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
import { useProfile } from '@/lib/use-profile'
import { Separator } from '@/components/ui/separator'
import { LangBadge } from '@/components/ui/badge'
import PermalinkButton from '@/components/permalink-button'
import { SelectOneOfYourLanguages } from '@/components/fields/select-one-of-your-languages'
import { PhraseStub } from '@/types/main'

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
})

function BulkAddPhrasesPage() {
	const { lang } = Route.useParams()
	const queryClient = useQueryClient()
	const { data: profile } = useProfile()

	const [successfullyAddedPhrases, setSuccessfullyAddedPhrases] = useState<
		Array<PhraseStub>
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
					translations: [
						{ lang: profile?.languages_known[0]?.lang ?? 'eng', text: '' },
					],
				},
			],
		},
	})

	const { fields, append, remove } = useFieldArray({
		control,
		name: 'phrases',
	})

	const bulkAddMutation = useMutation<
		Array<PhraseStub> | null,
		Error,
		BulkAddPhrasesFormValues
	>({
		mutationFn: async (values: BulkAddPhrasesFormValues) => {
			const payload = {
				p_lang: lang,
				p_phrases: values.phrases,
			}
			const { data, error } = await supabase.rpc('bulk_add_phrases', payload)
			if (error) throw error
			return data
		},
		onSuccess: (newlyAddedPhrases) => {
			if (!newlyAddedPhrases) return
			toast.success(`${newlyAddedPhrases.length} phrases added successfully!`)
			void queryClient.invalidateQueries({ queryKey: ['language', lang] })
			setSuccessfullyAddedPhrases((prev) => [...newlyAddedPhrases, ...prev])
			// Reset the form for the next batch
			// eslint-disable-next-line @typescript-eslint/no-use-before-define
			reset({
				phrases: [getEmptyPhrase(profile?.languages_known[0]?.lang)],
			})
		},
		onError: (error) => {
			toast.error(`Error adding phrases: ${error.message}`)
		},
	})

	return (
		<Card>
			<CardHeader>
				<CardTitle>Bulk Add Phrases to {languages[lang]}</CardTitle>
				<CardDescription>
					Add multiple phrases and their translations at once.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					noValidate
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
								errors={errors.phrases?.[phraseIndex]}
								disableRemove={fields.length === 1}
							/>
						))}
					</div>

					<div className="flex justify-between">
						<Button
							type="button"
							variant="outline"
							onClick={() =>
								append(getEmptyPhrase(profile?.languages_known[0]?.lang))
							}
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
							{successfullyAddedPhrases.map((phrase) => (
								// eslint-disable-next-line @typescript-eslint/no-use-before-define
								<AddedPhraseItem key={phrase.id} phrase={phrase} />
							))}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

const getEmptyPhrase = (lang: string = 'eng') => ({
	phrase_text: '',
	translations: [{ lang, text: '' }],
})

type PhraseEntryErrors =
	| (z.infer<typeof PhraseWithTranslationsSchema> & {
			root?: FieldError
	  })
	| undefined

function PhraseEntry({
	phraseIndex,
	control,
	register,
	removePhrase,
	errors,
	disableRemove = false,
}: {
	phraseIndex: number
	control: any
	register: any
	removePhrase: (index: number) => void
	errors: PhraseEntryErrors
	disableRemove: boolean
}) {
	const { lang } = Route.useParams()
	const {
		fields: translationFields,
		append: appendTranslation,
		remove: removeTranslation,
	} = useFieldArray({
		control,
		name: `phrases.${phraseIndex}.translations`,
	})
	const { data: profile } = useProfile()

	return (
		<div className="bg-card space-y-4 rounded-lg border p-4">
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
					<ErrorLabel error={errors?.phrase_text} />
				</div>
			</div>

			<div className="ml-4 space-y-3 border-s-2 border-dashed pl-4">
				<Label>Translations</Label>
				{translationFields.map((translationField, translationIndex) => (
					<div
						key={translationField.id}
						className="bg-background flex flex-col gap-2 rounded p-2"
					>
						<div className="flex w-full flex-row items-center justify-between gap-2">
							<Controller
								control={control}
								name={`phrases.${phraseIndex}.translations.${translationIndex}.lang`}
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
								size="icon-sm"
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
									error={errors?.translations?.[translationIndex]?.text}
								/>
								<ErrorLabel
									error={errors?.translations?.[translationIndex]?.lang}
								/>
							</div>
						</div>
					</div>
				))}
				<ErrorLabel error={errors?.translations?.root} />
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() =>
						appendTranslation({
							lang: profile?.languages_known[0]?.lang,
							text: '',
						})
					}
				>
					<Plus className="mr-2 size-4" /> Add Translation
				</Button>
			</div>
			<ErrorLabel error={errors?.root} />
		</div>
	)
}

function AddedPhraseItem({ phrase }: { phrase: PhraseStub }) {
	if (!phrase.id || !phrase.lang) return null

	return (
		<div className="bg-card rounded-lg border p-4">
			<div className="flex items-center justify-between">
				<h4 className="font-semibold">{phrase.text}</h4>
				<PermalinkButton
					to="/learn/$lang/$id"
					params={{ lang: phrase.lang, id: phrase.id }}
					variant="ghost"
					size="icon-sm"
					text=""
				/>
			</div>
			<ul className="mt-2 space-y-1">
				{phrase.translations?.map((t) => (
					<li key={t.id} className="flex items-center gap-2 text-sm">
						<LangBadge lang={t.lang!} />
						<span>{t.text}</span>
					</li>
				))}
			</ul>
		</div>
	)
}
