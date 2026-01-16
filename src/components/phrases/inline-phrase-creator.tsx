import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import * as z from 'zod'
import toast from 'react-hot-toast'
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
import {
	PhraseFullSchema,
	TranslationSchema,
	CardMetaSchema,
} from '@/lib/schemas'
import { phrasesCollection, cardsCollection } from '@/lib/collections'
import { useInvalidateFeed } from '@/hooks/use-feed'
import { usePreferredTranslationLang } from '@/hooks/use-deck'

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
}

export function InlinePhraseCreator({
	lang,
	onPhraseCreated,
	onCancel,
}: InlinePhraseCreatorProps) {
	const preferredTranslationLang = usePreferredTranslationLang(lang)
	const {
		register,
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<InlinePhraseFormValues>({
		resolver: zodResolver(inlinePhraseSchema),
		defaultValues: {
			phrase_text: '',
			translation_text: '',
			translation_lang: preferredTranslationLang,
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
			}
			const { data } = await supabase
				.rpc('add_phrase_translation_card', args)
				.throwOnError()

			return data as {
				phrase: Tables<'phrase'>
				translation: Tables<'phrase_translation'>
				card: Tables<'user_card'>
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
			toast.success('Phrase created and added to your deck')
			onPhraseCreated(data.phrase.id)
		},
		onError: (error) => {
			toast.error(`Failed to create phrase: ${error.message}`)
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
					void handleSubmit((data) => mutation.mutate(data))(e)
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

				<Button
					type="submit"
					size="sm"
					disabled={mutation.isPending}
					className="w-full"
				>
					{mutation.isPending ?
						<IconSizedLoader />
					:	<Plus className="h-4 w-4" />}
					Create and Select Phrase
				</Button>
			</form>
		</div>
	)
}
