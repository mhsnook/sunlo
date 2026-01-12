import { CSSProperties, useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { useDebounce } from '@uidotdev/usehooks'
import { NotebookPen, Search } from 'lucide-react'

import type { Tables } from '@/types/supabase'
import type { uuid } from '@/types/main'
import { RequireAuth } from '@/components/require-auth'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import languages from '@/lib/languages'
import { IconSizedLoader } from '@/components/ui/loader'
import supabase from '@/lib/supabase-client'
import TranslationTextField from '@/components/fields/translation-text-field'
import TranslationLanguageField from '@/components/fields/translation-language-field'
import { buttonVariants } from '@/components/ui/button-variants'
import {
	CardMetaSchema,
	DeckMetaSchema,
	PhraseFullSchema,
	TranslationSchema,
} from '@/lib/schemas'
import {
	cardsCollection,
	decksCollection,
	phrasesCollection,
} from '@/lib/collections'
import { useInvalidateFeed } from '@/hooks/use-feed'
import { WithPhrase } from '@/components/with-phrase'
import { CardResultSimple } from '@/components/cards/card-result-simple'
import { Separator } from '@/components/ui/separator'
import {
	useDeckMeta,
	useDecks,
	usePreferredTranslationLang,
} from '@/hooks/use-deck'
import { useUserId } from '@/lib/use-auth'
import { Item, ItemContent, ItemMedia } from '@/components/ui/item'

export interface SearchParams {
	text?: string
}

export const Route = createFileRoute('/_user/learn/$lang/add-phrase')({
	validateSearch: (search: Record<string, unknown>): SearchParams => {
		return {
			text: (search?.text as string) ?? '',
		}
	},
	beforeLoad: ({ params: { lang } }) => ({
		titleBar: {
			title: `Add ${languages[lang]} Phrase`,
		},
	}),
	loader: async () => {
		await cardsCollection.preload()
	},
	component: AddPhraseTab,
})

const addPhraseSchema = z.object({
	phrase_text: z.string().min(1, 'Please enter a phrase'),
	translation_lang: z
		.string()
		.length(3, 'Provide a language for the translation'),
	translation_text: z.string().min(1, 'Please enter the translation'),
})

type AddPhraseFormValues = z.infer<typeof addPhraseSchema>

const style = { viewTransitionName: `main-area` } as CSSProperties

function AddPhraseTab() {
	const navigate = Route.useNavigate()
	const { lang } = Route.useParams()
	const { text } = Route.useSearch()
	const userId = useUserId()
	const preferredTranslationLang = usePreferredTranslationLang(lang)
	const searchPlusText = (search: SearchParams) => ({
		...search,
		text,
	})

	const [newPhrases, setNewPhrases] = useState<uuid[]>([])

	// Deck status detection
	const { data: deck } = useDeckMeta(lang)
	const { data: allDecks } = useDecks()
	const hasActiveDeck = !!deck && !deck.archived
	const hasArchivedDeck = !!deck && deck.archived
	const noDeck = !deck
	const showDeckCheckbox = noDeck || hasArchivedDeck
	const [shouldCreateOrReactivateDeck, setShouldCreateOrReactivateDeck] =
		useState(true)

	const searchPhrase = text || ''
	const {
		control,
		register,
		handleSubmit,
		watch,
		reset,
		formState: { errors },
	} = useForm<AddPhraseFormValues>({
		resolver: zodResolver(addPhraseSchema),
		defaultValues: {
			phrase_text: searchPhrase,
			translation_lang: preferredTranslationLang,
		},
	})

	const phraseText = watch('phrase_text')
	const debouncedText = useDebounce(phraseText, 300)

	useEffect(() => {
		if (debouncedText !== text) {
			void navigate({
				replace: true,
				search: (search: SearchParams) => ({
					...search,
					text: debouncedText || undefined,
				}),
				params: true,
			})
		}
	}, [text, debouncedText, navigate])

	const invalidateFeed = useInvalidateFeed()
	const addPhraseMutation = useMutation({
		mutationFn: async (variables: AddPhraseFormValues) => {
			// Determine if we should create a card
			// Only create card if user has active deck OR is creating/reactivating one
			const shouldCreateCard = hasActiveDeck || shouldCreateOrReactivateDeck

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

			// Add phrase (and optionally card)
			const { data } = await supabase
				.rpc('add_phrase_translation_card', {
					phrase_lang: lang,
					phrase_text: variables.phrase_text,
					translation_lang: variables.translation_lang,
					translation_text: variables.translation_text,
					create_card: shouldCreateCard,
				})
				.throwOnError()

			return {
				rpcResult: data as {
					phrase: Tables<'phrase'>
					translation: Tables<'phrase_translation'>
					card: Tables<'user_card'> | null
				},
				newDeck,
				createdCard: shouldCreateCard,
			}
		},
		onSuccess: ({ rpcResult, newDeck, createdCard }) => {
			if (!rpcResult)
				throw new Error('No data returned from add_phrase_translation_card')

			// Update phrase collection
			phrasesCollection.utils.writeInsert(
				PhraseFullSchema.parse({
					...rpcResult.phrase,
					translations: [TranslationSchema.parse(rpcResult.translation)],
				})
			)

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

			// Update card collection if we created a card
			if (createdCard && rpcResult.card) {
				cardsCollection.utils.writeInsert(CardMetaSchema.parse(rpcResult.card))
			}

			invalidateFeed(lang)
			console.log(`Success:`, rpcResult)
			setNewPhrases((prev) => [rpcResult.phrase.id, ...prev])
			reset({
				phrase_text: '',
				translation_text: '',
				translation_lang:
					rpcResult.translation.lang ?? preferredTranslationLang,
			})

			// Show appropriate success message
			if (newDeck && createdCard) {
				const deckAction =
					hasArchivedDeck ?
						`re-activated your ${languages[lang]} deck`
					:	`started learning ${languages[lang]}`
				toast.success(
					`Phrase added to the library! You've ${deckAction} and the phrase will appear in your next review.`
				)
			} else if (createdCard) {
				toast.success(
					'New phrase has been added to the public library and will appear in your next review'
				)
			} else {
				toast.success(
					'Phrase has been added to the public library (not added to your deck)'
				)
			}
		},
		onError: (error) => {
			toast.error(
				`There was an error submitting this new phrase: ${error.message}`
			)
			console.log(`Error:`, error)
		},
	})

	return (
		<RequireAuth message="You need to be logged in to add new phrases.">
			<main style={style}>
				<Card>
					<CardHeader>
						<CardTitle>Add A Phrase</CardTitle>
						<CardDescription>
							Search for a phrase or add a new one to your deck.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form
							noValidate
							// eslint-disable-next-line @typescript-eslint/no-misused-promises
							onSubmit={handleSubmit((data) => addPhraseMutation.mutate(data))}
							className="mt-2 space-y-4"
						>
							<div>
								<Label htmlFor="newPhrase">
									Text of the Phrase (in {languages[lang]})
								</Label>
								<Controller
									name="phrase_text"
									control={control}
									// oxlint-disable-next-line jsx-no-new-function-as-prop
									render={({ field }) => (
										<Textarea
											{...field}
											placeholder="The text of the phrase to learn"
										/>
									)}
								/>
							</div>
							<TranslationTextField<AddPhraseFormValues>
								error={errors.translation_text}
								register={register}
							/>
							<TranslationLanguageField<AddPhraseFormValues>
								error={errors.translation_lang}
								control={control}
							/>
							{showDeckCheckbox && (
								<Item variant="outline">
									<ItemMedia>
										<Checkbox
											id="create-deck"
											checked={shouldCreateOrReactivateDeck}
											className="mt-2 mb-3"
											// oxlint-disable-next-line jsx-no-new-function-as-prop
											onCheckedChange={(checked) =>
												setShouldCreateOrReactivateDeck(checked === true)
											}
										/>
									</ItemMedia>
									<ItemContent>
										<Label
											htmlFor="create-deck"
											className="cursor-pointer text-sm font-normal"
										>
											You are not currently learning working on an{' '}
											{languages[lang]} deck.{' '}
											{hasArchivedDeck ?
												`Re-activate ${languages[lang]} deck`
											:	`Start learning ${languages[lang]}?`}
										</Label>
									</ItemContent>
								</Item>
							)}
							<div className="flex w-full flex-col justify-between gap-2 pt-8 @xl:flex-row">
								<Button
									type="submit"
									className={addPhraseMutation.isPending ? 'opacity-60' : ''}
									disabled={addPhraseMutation.isPending}
								>
									{addPhraseMutation.isPending ?
										<IconSizedLoader />
									:	<NotebookPen />}
									Save and add another
								</Button>
								<Link
									to="/learn/$lang/search"
									from={Route.fullPath}
									search={searchPlusText}
									className={buttonVariants({ variant: 'outline' })}
								>
									<Search size={16} />
									Search phrases
								</Link>

								<Link
									to="/learn/$lang/bulk-add"
									from={Route.fullPath}
									className={buttonVariants({ variant: 'outline' })}
								>
									Bulk add phrases
								</Link>
							</div>
						</form>
					</CardContent>
				</Card>
				{newPhrases.length > 0 && (
					<div className="my-6">
						<Separator className="my-6" />
						<h3 className="mb-4 text-lg font-semibold">Successfully Added</h3>
						<div className="space-y-2">
							{newPhrases.map((pid: uuid) => (
								<WithPhrase key={pid} pid={pid} Component={CardResultSimple} />
							))}
						</div>
					</div>
				)}
			</main>
		</RequireAuth>
	)
}
