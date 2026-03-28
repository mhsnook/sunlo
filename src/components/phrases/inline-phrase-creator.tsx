import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import * as z from 'zod'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { Plus, ChevronUp } from 'lucide-react'
import { Controller } from 'react-hook-form'

import type { Tables } from '@/types/supabase'
import type { RPCFunctions } from '@/types/main'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { IconSizedLoader } from '@/components/ui/loader'
import supabase from '@/lib/supabase-client'
import languages from '@/lib/languages'
import TranslationLanguageField from '@/components/fields/translation-language-field'
import { PhraseFullSchema, TranslationSchema } from '@/features/phrases/schemas'
import { CardMetaSchema } from '@/features/deck/schemas'
import { phrasesCollection } from '@/features/phrases/collections'
import { cardsCollection } from '@/features/deck/collections'
import { useInvalidateFeed } from '@/features/feed/hooks'
import { usePreferredTranslationLang, useDecks } from '@/features/deck/hooks'

const inlinePhraseSchema = z.object({
	phrase_text: z.string().min(1, 'Enter a phrase'),
	translation_text: z.string().min(1, 'Enter the translation'),
	translation_lang: z.string().length(3, 'Select a language'),
	only_reverse: z.boolean().default(false),
})

type InlinePhraseFormValues = z.infer<typeof inlinePhraseSchema>

interface InlinePhraseCreatorProps {
	lang: string
	onPhraseCreated: (phraseId: string) => void
	onCancel: () => void
	/** Label for the primary submit button. Defaults to "Create and select phrase". */
	submitLabel?: string
	/** When true, shows a secondary "Save & add another" button that resets the form. */
	allowAddAnother?: boolean
}

export function InlinePhraseCreator({
	lang,
	onPhraseCreated,
	onCancel,
	submitLabel = 'Create and select phrase',
	allowAddAnother = false,
}: InlinePhraseCreatorProps) {
	const preferredTranslationLang = usePreferredTranslationLang(lang)
	// Key + overrideLang drive remounting with fresh defaultValues
	const [formKey, setFormKey] = useState(0)
	const [overrideLang, setOverrideLang] = useState<string | null>(null)

	return (
		<InlinePhraseForm
			key={formKey}
			lang={lang}
			defaultTranslationLang={overrideLang ?? preferredTranslationLang}
			submitLabel={submitLabel}
			allowAddAnother={allowAddAnother}
			onPhraseCreated={onPhraseCreated}
			onCancel={onCancel}
			onAddAnother={(translationLang) => {
				setOverrideLang(translationLang)
				setFormKey((k) => k + 1)
			}}
		/>
	)
}

function InlinePhraseForm({
	lang,
	defaultTranslationLang,
	submitLabel,
	allowAddAnother,
	onPhraseCreated,
	onCancel,
	onAddAnother,
}: {
	lang: string
	defaultTranslationLang: string
	submitLabel: string
	allowAddAnother: boolean
	onPhraseCreated: (phraseId: string) => void
	onCancel: () => void
	onAddAnother: (translationLang: string) => void
}) {
	const { data: decks } = useDecks()
	const hasDeck = decks?.some((d) => d.lang === lang) ?? false
	const {
		register,
		control,
		handleSubmit,
		getValues,
		formState: { errors },
	} = useForm<InlinePhraseFormValues>({
		resolver: zodResolver(inlinePhraseSchema),
		defaultValues: {
			phrase_text: '',
			translation_text: '',
			translation_lang: defaultTranslationLang,
			only_reverse: false,
		},
	})
	const invalidateFeed = useInvalidateFeed()

	const mutation = useMutation({
		mutationFn: async (values: InlinePhraseFormValues) => {
			const args: RPCFunctions['add_phrase_translation_card']['Args'] = {
				phrase_lang: lang,
				phrase_text: values.phrase_text,
				translation_text: values.translation_text,
				translation_lang: values.translation_lang,
				phrase_only_reverse: values.only_reverse,
				create_card: hasDeck,
			}
			const { data } = await supabase
				.rpc('add_phrase_translation_card', args)
				.throwOnError()

			return data as {
				phrase: Tables<'phrase'>
				translation: Tables<'phrase_translation'>
				card: Tables<'user_card'> | null
			}
		},
		onSuccess: (data) => {
			if (!data) throw new Error('No data returned')

			// Update local collections
			phrasesCollection.utils.writeInsert(
				PhraseFullSchema.parse({
					...data.phrase,
					translations: [TranslationSchema.parse(data.translation)],
				})
			)
			if (data.card) {
				cardsCollection.utils.writeInsert(CardMetaSchema.parse(data.card))
				phrasesCollection.utils.writeUpdate({
					id: data.card.phrase_id,
					count_learners: 1,
				})
			}
			invalidateFeed(lang)
			toastSuccess(
				data.card ? 'Phrase created and added to your deck' : 'Phrase created'
			)
			onPhraseCreated(data.phrase.id)
		},
		onError: (error) => {
			toastError(`Failed to create phrase: ${error.message}`)
		},
	})

	return (
		<div className="bg-muted/30 rounded-lg border p-4">
			<div className="mb-3 flex items-center justify-between">
				<h4 className="font-medium">Create New Phrase</h4>
				<Button type="button" variant="ghost" size="sm" onClick={onCancel}>
					<ChevronUp className="h-4 w-4" />
					Cancel
				</Button>
			</div>

			<form
				noValidate
				onSubmit={(e) => {
					e.stopPropagation()
					void handleSubmit((data) =>
						mutation.mutate(data, { onSuccess: () => onCancel() })
					)(e)
				}}
				className="space-y-3"
			>
				<div>
					<Label htmlFor="inline-phrase-text" className="text-sm">
						Phrase in {languages[lang]}
					</Label>
					<Input
						id="inline-phrase-text"
						{...register('phrase_text')}
						placeholder="Enter the phrase..."
						className={errors.phrase_text ? 'border-red-500' : ''}
					/>
					{errors.phrase_text && (
						<p className="text-xs text-red-500">{errors.phrase_text.message}</p>
					)}
				</div>

				<div>
					<Label htmlFor="inline-translation-text" className="text-sm">
						Translation
					</Label>
					<Input
						id="inline-translation-text"
						{...register('translation_text')}
						placeholder="Enter the translation..."
						className={errors.translation_text ? 'border-red-500' : ''}
					/>
					{errors.translation_text && (
						<p className="text-xs text-red-500">
							{errors.translation_text.message}
						</p>
					)}
				</div>

				<TranslationLanguageField<InlinePhraseFormValues>
					error={errors.translation_lang}
					control={control}
				/>

				<div className="flex items-center gap-2">
					<Controller
						control={control}
						name="only_reverse"
						render={({ field }) => (
							<Checkbox
								id="inline-only-reverse"
								checked={field.value}
								onCheckedChange={field.onChange}
							/>
						)}
					/>
					<Label
						htmlFor="inline-only-reverse"
						className="text-muted-foreground cursor-pointer text-sm font-normal"
					>
						Only reverse reviews make sense
					</Label>
				</div>

				<div className="flex gap-2">
					<Button
						type="submit"
						size="sm"
						disabled={mutation.isPending}
						className="flex-1"
					>
						{mutation.isPending ?
							<IconSizedLoader />
						:	<Plus className="h-4 w-4" />}
						{submitLabel}
					</Button>
					{allowAddAnother && (
						<Button
							type="button"
							variant="soft"
							size="sm"
							disabled={mutation.isPending}
							onClick={() => {
								void handleSubmit((formData) => {
									mutation.mutate(formData, {
										onSuccess: () => {
											onAddAnother(getValues('translation_lang'))
										},
									})
								})()
							}}
						>
							Save & add another
						</Button>
					)}
				</div>
			</form>
		</div>
	)
}
