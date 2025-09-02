import { createFileRoute } from '@tanstack/react-router'
import { useFieldArray, useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Input } from '@/components/ui/input'
import { SelectOneLanguage } from '@/components/select-one-language'
import ErrorLabel from '@/components/fields/error-label'
import { ShowAndLogError } from '@/components/errors'
import languages from '@/lib/languages'
import { useProfile } from '@/lib/use-profile'

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

	const {
		control,
		handleSubmit,
		register,
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

	const bulkAddMutation = useMutation({
		mutationFn: async (values: BulkAddPhrasesFormValues) => {
			const payload = {
				p_lang: lang,
				p_phrases: values.phrases,
			}
			const { error } = await supabase.rpc('bulk_add_phrases', payload)
			if (error) throw error
		},
		onSuccess: () => {
			toast.success('Phrases added successfully!')
			void queryClient.invalidateQueries({ queryKey: ['language', lang] })
			// Maybe reset the form or navigate away
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
							/>
						))}
					</div>

					<div className="flex justify-between">
						<Button
							type="button"
							variant="outline"
							onClick={() =>
								append({
									phrase_text: '',
									translations: [{ lang: 'eng', text: '' }],
								})
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
			</CardContent>
		</Card>
	)
}

function PhraseEntry({
	phraseIndex,
	control,
	register,
	removePhrase,
	errors,
}: {
	phraseIndex: number
	control: any
	register: any
	removePhrase: (index: number) => void
	errors: any
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

	return (
		<div className="space-y-4 rounded-lg border bg-card p-4">
			<div className="flex items-start justify-between gap-2">
				<div className="flex-1 space-y-2">
					<Label htmlFor={`phrases.${phraseIndex}.phrase_text`}>
						Phrase in {languages[lang]}
					</Label>
					<Textarea
						id={`phrases.${phraseIndex}.phrase_text`}
						{...register(`phrases.${phraseIndex}.phrase_text`)}
						placeholder="Enter the phrase to learn"
					/>
					<ErrorLabel error={errors?.phrase_text} />
				</div>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					onClick={() => removePhrase(phraseIndex)}
					className="mt-6"
				>
					<Trash2 className="text-destructive size-4" />
				</Button>
			</div>

			<div className="ml-4 space-y-3 border-s-2 border-dashed pl-4">
				<Label>Translations</Label>
				{translationFields.map((translationField, translationIndex) => (
					<div
						key={translationField.id}
						className="flex items-end gap-2 rounded bg-background p-2"
					>
						<div className="w-40">
							<Controller
								control={control}
								name={`phrases.${phraseIndex}.translations.${translationIndex}.lang`}
								render={({ field }) => (
									<SelectOneLanguage
										value={field.value}
										setValue={field.onChange}
									/>
								)}
							/>
							<ErrorLabel
								error={errors?.translations?.[translationIndex]?.lang}
							/>
						</div>
						<div className="flex-1">
							<Input
								{...register(
									`phrases.${phraseIndex}.translations.${translationIndex}.text`
								)}
								placeholder="Translation text"
							/>
							<ErrorLabel
								error={errors?.translations?.[translationIndex]?.text}
							/>
						</div>
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
				))}
				<ErrorLabel error={errors?.translations?.root} />
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => appendTranslation({ lang: 'eng', text: '' })}
				>
					<Plus className="mr-2 size-4" /> Add Translation
				</Button>
			</div>
			<ErrorLabel error={errors?.root} />
		</div>
	)
}