import { useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import * as z from 'zod'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { ChevronUp } from 'lucide-react'

import type { Tables } from '@/types/supabase'
import type { RPCFunctions } from '@/types/main'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import supabase from '@/lib/supabase-client'
import languages from '@/lib/languages'
import TranslationLanguageField from '@/components/fields/translation-language-field'
import { PhraseFullSchema, TranslationSchema } from '@/features/phrases/schemas'
import { CardMetaSchema } from '@/features/deck/schemas'
import { phrasesCollection } from '@/features/phrases/collections'
import { cardsCollection } from '@/features/deck/collections'
import { useInvalidateFeed } from '@/features/feed/hooks'
import { usePreferredTranslationLang, useDecks } from '@/features/deck/hooks'
import { useAppForm } from '@/components/form'

const createInlinePhraseSchema = (phraseLang: string) =>
	z.object({
		phrase_text: z.string().min(1, 'Enter a phrase'),
		translation_text: z.string().min(1, 'Enter the translation'),
		translation_lang: z
			.string()
			.length(3, 'Select a language')
			.refine((val) => val !== phraseLang, {
				message:
					'Translation language cannot be the same as the phrase language',
			}),
		only_reverse: z.boolean(),
	})

type InlinePhraseFormValues = z.infer<
	ReturnType<typeof createInlinePhraseSchema>
>

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
	submitLabel = 'Create Phrase',
	allowAddAnother = false,
}: InlinePhraseCreatorProps) {
	const preferredTranslationLang = usePreferredTranslationLang(lang)
	// Key + overrideLang drive remounting with fresh defaultValues
	const [formKey, setFormKey] = useState(0)
	const [overrideLang, setOverrideLang] = useState<string | null>(null)
	// Hold the container height stable during remount to prevent layout shift
	const wrapperRef = useRef<HTMLDivElement>(null)
	const [holdHeight, setHoldHeight] = useState<number | undefined>(undefined)

	return (
		<div
			ref={wrapperRef}
			style={holdHeight ? { minHeight: holdHeight } : undefined}
		>
			<InlinePhraseForm
				key={formKey}
				lang={lang}
				defaultTranslationLang={overrideLang ?? preferredTranslationLang}
				submitLabel={submitLabel}
				allowAddAnother={allowAddAnother}
				onPhraseCreated={onPhraseCreated}
				onCancel={onCancel}
				onAddAnother={(translationLang) => {
					if (wrapperRef.current) {
						setHoldHeight(wrapperRef.current.offsetHeight)
					}
					setOverrideLang(translationLang)
					setFormKey((k) => k + 1)
					requestAnimationFrame(() => {
						requestAnimationFrame(() => setHoldHeight(undefined))
					})
				}}
				animate={formKey > 0}
			/>
		</div>
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
	animate,
}: {
	lang: string
	defaultTranslationLang: string
	submitLabel: string
	allowAddAnother: boolean
	onPhraseCreated: (phraseId: string) => void
	onCancel: () => void
	onAddAnother: (translationLang: string) => void
	animate: boolean
}) {
	const { data: decks } = useDecks()
	const hasDeck = decks?.some((d) => d.lang === lang) ?? false
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
				card_reverse: Tables<'user_card'> | null
			}
		},
		onSuccess: (data) => {
			if (!data) throw new Error('No data returned')

			phrasesCollection.utils.writeInsert(
				PhraseFullSchema.parse({
					...data.phrase,
					translations: [TranslationSchema.parse(data.translation)],
				})
			)
			if (data.card) {
				cardsCollection.utils.writeInsert(CardMetaSchema.parse(data.card))
				if (data.card_reverse) {
					cardsCollection.utils.writeInsert(
						CardMetaSchema.parse(data.card_reverse)
					)
				}
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

	const schema = useMemo(() => createInlinePhraseSchema(lang), [lang])
	const form = useAppForm({
		defaultValues: {
			phrase_text: '',
			translation_text: '',
			translation_lang: defaultTranslationLang,
			only_reverse: false,
		},
		validators: { onChange: schema },
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync(value)
			onCancel()
		},
	})

	return (
		<div
			data-testid="inline-phrase-creator"
			className={`bg-muted/30 rounded-lg border p-4 ${animate ? 'animate-in fade-in duration-300' : ''}`}
		>
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
					e.preventDefault()
					e.stopPropagation()
					void form.handleSubmit()
				}}
				className="space-y-3"
			>
				<form.AppField name="phrase_text">
					{(field) => (
						<field.TextInput
							label={`Phrase in ${languages[lang]}`}
							placeholder="Enter the phrase..."
						/>
					)}
				</form.AppField>

				<form.AppField name="translation_text">
					{(field) => (
						<field.TextInput
							label="Translation"
							placeholder="Enter the translation..."
						/>
					)}
				</form.AppField>

				<form.AppField name="translation_lang">
					{() => <TranslationLanguageField phraseLang={lang} />}
				</form.AppField>

				<div className="flex items-center gap-2">
					<form.AppField name="only_reverse">
						{(field) => (
							<Checkbox
								id="inline-only-reverse"
								checked={field.state.value}
								onCheckedChange={(checked) => {
									field.handleChange(checked === true)
									field.handleBlur()
								}}
							/>
						)}
					</form.AppField>
					<Label
						htmlFor="inline-only-reverse"
						className="text-muted-foreground cursor-pointer text-sm font-normal"
					>
						Only recall reviews make sense
					</Label>
				</div>

				<div className="flex gap-2">
					<form.AppForm>
						<form.SubmitButton size="sm" className="flex-1">
							{submitLabel}
						</form.SubmitButton>
					</form.AppForm>
					{allowAddAnother && (
						<Button
							type="button"
							variant="soft"
							size="sm"
							disabled={mutation.isPending}
							onClick={() => {
								void form.validateAllFields('submit').then(() => {
									if (!form.state.canSubmit) return
									const value = form.state.values
									mutation.mutate(value, {
										onSuccess: () => {
											onAddAnother(value.translation_lang)
										},
									})
								})
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
