import { CSSProperties, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import {
	type Control,
	type FieldErrors,
	type UseFormRegister,
	useFieldArray,
	useForm,
	Controller,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'

import supabase from '@/lib/supabase-client'
import { RequireAuth } from '@/components/require-auth'
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
import { Checkbox } from '@/components/ui/checkbox'
import ErrorLabel from '@/components/fields/error-label'
import { ShowAndLogError } from '@/components/errors'
import languages from '@/lib/languages'
import { usePreferredTranslationLang } from '@/hooks/use-deck'
import { Separator } from '@/components/ui/separator'
import { SelectOneOfYourLanguages } from '@/components/fields/select-one-of-your-languages'
import { CardResultSimple } from '@/components/cards/card-result-simple'
import { CardMetaSchema, DeckMetaSchema, PhraseFullSchema } from '@/lib/schemas'
import {
	cardsCollection,
	decksCollection,
	phrasesCollection,
} from '@/lib/collections'
import { Tables } from '@/types/supabase'
import { uuid } from '@/types/main'
import { WithPhrase } from '@/components/with-phrase'
import { useInvalidateFeed } from '@/hooks/use-feed'
import { useDeckMeta, useDecks } from '@/hooks/use-deck'
import { useUserId } from '@/lib/use-auth'

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
	only_reverse: z.boolean().default(false),
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

	// Deck status detection
	const { data: deck } = useDeckMeta(lang)
	const { data: allDecks } = useDecks()
	const hasActiveDeck = !!deck && !deck.archived
	const hasArchivedDeck = !!deck && deck.archived
	const noDeck = !deck
	const showDeckCheckbox = noDeck || hasArchivedDeck
	const [shouldCreateOrReactivateDeck, setShouldCreateOrReactivateDeck] =
		useState(true)
	const [shouldAddToMyDeck, setShouldAddToMyDeck] = useState(true)

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
			if (!userId) {
				console.log(`Auth guard didn't work in $lang.bulk-add`)
				throw new Error(
					"You must be logged in to add cards; please find the '/login' link in the sidebar, and use it."
				)
			}
			console.log(`Attempting mutation`, { values })

			// Handle deck creation/reactivation if needed
			let newDeck: Tables<'user_deck'> | null = null
			if (showDeckCheckbox && shouldCreateOrReactivateDeck) {
				if (hasArchivedDeck) {
					// Reactivate archived deck
					const { data } = await supabase
						.from('user_deck')
						.update({ archived: false })
						.eq('lang', lang)
						.eq('uid', userId)
						.select()
						.maybeSingle()
						.throwOnError()
					newDeck = data
				} else if (noDeck) {
					// Create new deck
					const { data } = await supabase
						.from('user_deck')
						.insert({ lang })
						.select()
						.maybeSingle()
						.throwOnError()
					newDeck = data
				}
			}

			const payload = {
				p_lang: lang,
				p_phrases: values.phrases,
				p_user_id: userId,
			}
			const { data, error } = await supabase.rpc('bulk_add_phrases', payload)
			console.log(`After mutation`, { values, data, error })

			if (error) throw error

			// Cast the RPC result to our expected type
			const rpcResult = data as BulkAddPhrasesResponse | null

			// Determine if we should create cards
			const shouldCreateCards =
				(hasActiveDeck || (shouldCreateOrReactivateDeck && showDeckCheckbox)) &&
				shouldAddToMyDeck

			// Create cards for each phrase if requested
			let cards: Tables<'user_card'>[] = []
			if (shouldCreateCards && rpcResult?.phrases?.length) {
				const cardsToInsert = rpcResult.phrases.map((p) => ({
					phrase_id: p.id,
					lang,
					uid: userId,
					status: 'active' as const,
				}))
				const { data: cardData } = await supabase
					.from('user_card')
					.insert(cardsToInsert)
					.select()
					.throwOnError()
				cards = cardData ?? []
			}

			return {
				rpcResult,
				newDeck,
				cards,
			}
		},
		onSuccess: ({ rpcResult, newDeck, cards }) => {
			if (!rpcResult) {
				toast('No data came back from the database :-/')
				return
			}

			// Update deck collection if we created/reactivated one
			if (newDeck) {
				const deckWithTheme = {
					...newDeck,
					language: languages[newDeck.lang],
					theme: (allDecks?.length ?? 0) % 5,
				}
				if (hasArchivedDeck) {
					decksCollection.utils.writeUpdate(DeckMetaSchema.parse(deckWithTheme))
				} else {
					decksCollection.utils.writeInsert(DeckMetaSchema.parse(deckWithTheme))
				}
			}

			const phrasesToInsert = rpcResult.phrases.map((p) =>
				PhraseFullSchema.parse({
					...p,
					translations: rpcResult.translations.filter(
						(t) => t.phrase_id === p.id
					),
				})
			)
			phrasesToInsert.forEach((p) => phrasesCollection.utils.writeInsert(p))

			// Update card collection if we created cards
			if (cards.length) {
				cards.forEach((card) =>
					cardsCollection.utils.writeInsert(CardMetaSchema.parse(card))
				)
			}

			invalidateFeed(lang)
			setSuccessfullyAddedPhrases((prev) => [
				...phrasesToInsert.map((p) => p.id),
				...prev,
			])
			// Reset the form for the next batch
			reset({
				phrases: [getEmptyPhrase(preferredTranslationLang)],
			})

			// Show appropriate success message
			const cardsMessage =
				cards.length ? ' They will appear in your next review.' : ''
			if (newDeck) {
				const deckAction =
					hasArchivedDeck ?
						`re-activated your ${languages[lang]} deck`
					:	`started learning ${languages[lang]}`
				toast.success(
					`${rpcResult.phrases.length} phrases added! You've also ${deckAction}.${cardsMessage}`
				)
			} else {
				toast.success(
					`${rpcResult.phrases.length} phrases added successfully!${cardsMessage}`
				)
			}
		},
		onError: (error) => {
			toast.error(`Error adding phrases: ${error.message}`)
		},
	})

	return (
		<RequireAuth message="You need to be logged in to bulk add phrases.">
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
										errors={errors.phrases}
										disableRemove={fields.length === 1}
									/>
								))}
							</div>

							<div className="flex justify-between">
								<Button
									type="button"
									variant="outline"
									onClick={() =>
										append(getEmptyPhrase(preferredTranslationLang))
									}
								>
									<Plus className="mr-2 size-4" /> Add Another Phrase
								</Button>
							</div>

							{showDeckCheckbox && (
								<div className="flex items-center gap-3 rounded-lg border p-4">
									<Checkbox
										id="create-deck"
										checked={shouldCreateOrReactivateDeck}
										onCheckedChange={(checked) =>
											setShouldCreateOrReactivateDeck(checked === true)
										}
									/>
									<Label htmlFor="create-deck" className="cursor-pointer">
										{hasArchivedDeck ?
											`Re-activate ${languages[lang]} deck`
										:	`Start learning ${languages[lang]}`}
									</Label>
								</div>
							)}

							{(hasActiveDeck ||
								(showDeckCheckbox && shouldCreateOrReactivateDeck)) && (
								<div className="flex items-center gap-3 rounded-lg border p-4">
									<Checkbox
										id="add-to-deck"
										checked={shouldAddToMyDeck}
										onCheckedChange={(checked) =>
											setShouldAddToMyDeck(checked === true)
										}
										className="mt-2 mb-3"
									/>
									<Label htmlFor="add-to-deck" className="cursor-pointer">
										Add these phrases to my deck for review
									</Label>
								</div>
							)}

							<Button
								type="submit"
								className="w-full"
								disabled={!isDirty || isSubmitting || bulkAddMutation.isPending}
							>
								Save All Phrases ({fields.length})
							</Button>
							<ShowAndLogError
								error={bulkAddMutation.error}
								text="There was an error submitting your phrases"
							/>
						</form>
						{successfullyAddedPhrases.length > 0 && (
							<div className="my-6">
								<Separator className="my-6" />
								<h3 className="mb-4 text-lg font-semibold">
									Successfully Added
								</h3>
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
		</RequireAuth>
	)
}

const getEmptyPhrase = (lang: string = 'eng') => ({
	phrase_text: '',
	translations: [{ lang, text: '' }],
	only_reverse: false,
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
	errors: FieldErrors<BulkAddPhrasesFormValues>['phrases']
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
							{phraseIndex + 1}. Phrase in {languages[lang]}
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
					<ErrorLabel error={errors?.[phraseIndex]?.phrase_text} />
					<div className="flex items-center gap-2 pt-1">
						<Controller
							control={control}
							name={`phrases.${phraseIndex}.only_reverse`}
							render={({ field }) => (
								<Checkbox
									id={`phrases.${phraseIndex}.only_reverse`}
									checked={field.value}
									className="mb-1"
									onCheckedChange={field.onChange}
								/>
							)}
						/>
						<Label
							htmlFor={`phrases.${phraseIndex}.only_reverse`}
							className="text-muted-foreground cursor-pointer text-sm font-normal"
						>
							Only reverse reviews make sense for this phrase
						</Label>
					</div>
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
										errors?.[phraseIndex]?.translations?.[translationIndex]
											?.text
									}
								/>
								<ErrorLabel
									error={
										errors?.[phraseIndex]?.translations?.[translationIndex]
											?.lang
									}
								/>
							</div>
						</div>
					</div>
				))}
				<ErrorLabel error={errors?.[phraseIndex]?.translations?.root} />
			</div>
			<Button
				type="button"
				variant="outline"
				onClick={() =>
					appendTranslation({
						lang: preferredTranslationLang,
						text: '',
					})
				}
			>
				<Plus className="mr-2 size-4" /> Add Translation
			</Button>
			<ErrorLabel error={errors?.[phraseIndex]?.root} />
		</Card>
	)
}
