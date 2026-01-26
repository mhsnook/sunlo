import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import * as z from 'zod'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { Plus, X } from 'lucide-react'

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
import {
	phrasesCollection,
	cardsCollection,
	playlistPhraseLinksCollection,
} from '@/lib/collections'
import { useInvalidateFeed } from '@/hooks/use-feed'
import { usePreferredTranslationLang } from '@/hooks/use-deck'

const inlinePlaylistCardSchema = z.object({
	phrase_text: z.string().min(1, 'Enter a phrase'),
	translation_text: z.string().min(1, 'Enter the translation'),
	translation_lang: z.string().length(3, 'Select a language'),
	only_reverse: z.boolean().default(false),
	href: z.string().default(''),
})

type InlinePlaylistCardFormValues = z.infer<typeof inlinePlaylistCardSchema>

interface InlinePlaylistCardCreatorProps {
	lang: string
	playlistId: string
	order: number
	sourceHref: string | null
	onDone: () => void
}

export function InlinePlaylistCardCreator({
	lang,
	playlistId,
	order,
	sourceHref,
	onDone,
}: InlinePlaylistCardCreatorProps) {
	const preferredTranslationLang = usePreferredTranslationLang(lang)
	const {
		register,
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<InlinePlaylistCardFormValues>({
		resolver: zodResolver(inlinePlaylistCardSchema),
		defaultValues: {
			phrase_text: '',
			translation_text: '',
			translation_lang: preferredTranslationLang,
			only_reverse: false,
			href: sourceHref ?? '',
		},
	})
	const invalidateFeed = useInvalidateFeed()

	const mutation = useMutation({
		mutationFn: async (values: InlinePlaylistCardFormValues) => {
			// Step 1: Create phrase + translation + card
			const args: RPCFunctions['add_phrase_translation_card']['Args'] = {
				phrase_lang: lang,
				phrase_text: values.phrase_text,
				translation_text: values.translation_text,
				translation_lang: values.translation_lang,
				phrase_only_reverse: values.only_reverse,
			}
			const { data: phraseData } = await supabase
				.rpc('add_phrase_translation_card', args)
				.throwOnError()

			const typedPhraseData = phraseData as {
				phrase: Tables<'phrase'>
				translation: Tables<'phrase_translation'>
				card: Tables<'user_card'>
			}

			// Step 2: Add to playlist
			const { data: linkData } = await supabase
				.from('playlist_phrase_link')
				.insert({
					playlist_id: playlistId,
					phrase_id: typedPhraseData.phrase.id,
					order,
					href: values.href.trim() || null,
				})
				.select()
				.single()
				.throwOnError()

			return { phraseData: typedPhraseData, linkData }
		},
		onSuccess: ({ phraseData, linkData }) => {
			if (!phraseData) throw new Error('No data returned')

			// Update phrase collection
			phrasesCollection.utils.writeInsert(
				PhraseFullSchema.parse({
					...phraseData.phrase,
					translations: [TranslationSchema.parse(phraseData.translation)],
				})
			)

			// Update card collection
			if (phraseData.card) {
				cardsCollection.utils.writeInsert(
					CardMetaSchema.parse(phraseData.card)
				)
				phrasesCollection.utils.writeUpdate({
					id: phraseData.card.phrase_id,
					count_learners: 1,
				})
			}

			// Update playlist link collection
			playlistPhraseLinksCollection.utils.writeInsert(linkData)

			invalidateFeed(lang)
			toastSuccess('Card created and added to playlist')
			onDone()
		},
		onError: (error) => {
			toastError(`Failed to create card: ${error.message}`)
			console.log('Error', error)
		},
	})

	return (
		<div className="bg-muted/30 rounded-lg border p-4">
			<div className="mb-3 flex items-center justify-between">
				<h4 className="font-medium">New card</h4>
				<Button type="button" variant="ghost" size="sm" onClick={onDone}>
					<X className="h-4 w-4" />
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
					<Label htmlFor="playlist-card-phrase-text" className="text-sm">
						Phrase in {languages[lang]}
					</Label>
					<Input
						id="playlist-card-phrase-text"
						{...register('phrase_text')}
						placeholder="Enter the phrase..."
						className={errors.phrase_text ? 'border-red-500' : ''}
					/>
					{errors.phrase_text && (
						<p className="text-xs text-red-500">
							{errors.phrase_text.message}
						</p>
					)}
				</div>

				<div>
					<Label htmlFor="playlist-card-translation-text" className="text-sm">
						Translation
					</Label>
					<Input
						id="playlist-card-translation-text"
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

				<TranslationLanguageField<InlinePlaylistCardFormValues>
					error={errors.translation_lang}
					control={control}
				/>

				<div>
					<Label htmlFor="playlist-card-href" className="text-sm">
						Timestamp link (optional)
					</Label>
					<Input
						id="playlist-card-href"
						{...register('href')}
						placeholder="Link to timestamp in source material..."
						type="url"
					/>
				</div>

				<div className="flex items-center gap-2">
					<Controller
						control={control}
						name="only_reverse"
						render={({ field }) => (
							<Checkbox
								id="playlist-card-only-reverse"
								checked={field.value}
								onCheckedChange={field.onChange}
							/>
						)}
					/>
					<Label
						htmlFor="playlist-card-only-reverse"
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
					Create Card
				</Button>
			</form>
		</div>
	)
}
