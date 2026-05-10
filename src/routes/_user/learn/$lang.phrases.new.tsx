import { CSSProperties, useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import * as z from 'zod'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { useDebounce } from '@/hooks/use-debounce'
import { Brain, Lightbulb, NotebookPen, Search } from 'lucide-react'

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
import { Checkbox } from '@/components/ui/checkbox'
import languages from '@/lib/languages'
import supabase from '@/lib/supabase-client'
import TranslationLanguageField from '@/components/fields/translation-language-field'
import { buttonVariants } from '@/components/ui/button'
import { PhraseFullSchema, TranslationSchema } from '@/features/phrases/schemas'
import { CardMetaSchema, DeckMetaSchema } from '@/features/deck/schemas'
import { phrasesCollection } from '@/features/phrases/collections'
import { cardsCollection, decksCollection } from '@/features/deck/collections'
import { useInvalidateFeed } from '@/features/feed/hooks'
import { WithPhrase } from '@/components/with-phrase'
import { CardResultSimple } from '@/components/cards/card-result-simple'
import { Separator } from '@/components/ui/separator'
import {
	useDeckMeta,
	useDecks,
	usePreferredTranslationLang,
} from '@/features/deck/hooks'
import { useUserId } from '@/lib/use-auth'
import { Item, ItemContent, ItemMedia } from '@/components/ui/item'
import { useAppForm } from '@/components/form'

export interface SearchParams {
	text?: string
}

export const Route = createFileRoute('/_user/learn/$lang/phrases/new')({
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
	loader: async ({ context }) => {
		if (context.auth.isAuth) {
			await cardsCollection.preload()
		}
	},
	component: AddPhraseTab,
})

const createAddPhraseSchema = (phraseLang: string) =>
	z.object({
		phrase_text: z.string().min(1, 'Please enter a phrase'),
		translation_lang: z
			.string()
			.length(3, 'Provide a language for the translation')
			.refine((val) => val !== phraseLang, {
				message:
					'Translation language cannot be the same as the phrase language',
			}),
		translation_text: z.string().min(1, 'Please enter the translation'),
		only_reverse: z.boolean(),
	})

type AddPhraseFormValues = z.infer<ReturnType<typeof createAddPhraseSchema>>

const style = { viewTransitionName: `main-area` } as CSSProperties

function AddPhraseTab() {
	const { lang } = Route.useParams()
	const { text } = Route.useSearch()
	const userId = useUserId()
	const preferredTranslationLang = usePreferredTranslationLang(lang)
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

	const invalidateFeed = useInvalidateFeed()
	const addPhraseMutation = useMutation({
		mutationFn: async (variables: AddPhraseFormValues) => {
			if (!userId) {
				console.log(`Auth guard didn't work in $lang.phrases.new`)
				throw new Error(
					"You must be logged in to add cards; please find the '/login' link in the sidebar, and use it."
				)
			}
			const shouldCreateCard = hasActiveDeck || shouldCreateOrReactivateDeck

			let newDeck: Tables<'user_deck'> | null = null
			if (showDeckCheckbox && shouldCreateOrReactivateDeck) {
				if (hasArchivedDeck) {
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
					const { data } = await supabase
						.from('user_deck')
						.insert({ lang })
						.select()
						.maybeSingle()
						.throwOnError()
					newDeck = data
				}
			}

			const { data } = await supabase
				.rpc('add_phrase_translation_card', {
					phrase_lang: lang,
					phrase_text: variables.phrase_text,
					translation_lang: variables.translation_lang,
					translation_text: variables.translation_text,
					create_card: shouldCreateCard,
					phrase_only_reverse: variables.only_reverse,
				})
				.throwOnError()

			return {
				rpcResult: data as {
					phrase: Tables<'phrase'>
					translation: Tables<'phrase_translation'>
					card: Tables<'user_card'> | null
					card_reverse: Tables<'user_card'> | null
				},
				newDeck,
				createdCard: shouldCreateCard,
			}
		},
		onSuccess: ({ rpcResult, newDeck, createdCard }) => {
			if (!rpcResult)
				throw new Error('No data returned from add_phrase_translation_card')

			phrasesCollection.utils.writeInsert(
				PhraseFullSchema.parse({
					...rpcResult.phrase,
					translations: [TranslationSchema.parse(rpcResult.translation)],
				})
			)
			if (rpcResult.card)
				phrasesCollection.utils.writeUpdate({
					id: rpcResult.phrase.id,
					count_learners: 1,
				})

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

			if (createdCard && rpcResult.card) {
				cardsCollection.utils.writeInsert(CardMetaSchema.parse(rpcResult.card))
				if (rpcResult.card_reverse) {
					cardsCollection.utils.writeInsert(
						CardMetaSchema.parse(rpcResult.card_reverse)
					)
				}
			}

			invalidateFeed(lang)
			console.log(`Success:`, rpcResult)
			setNewPhrases((prev) => [rpcResult.phrase.id, ...prev])
			form.reset({
				phrase_text: '',
				translation_text: '',
				translation_lang:
					rpcResult.translation.lang ?? preferredTranslationLang,
				only_reverse: false,
			})

			if (newDeck && createdCard) {
				const deckAction = hasArchivedDeck
					? `re-activated your ${languages[lang]} deck`
					: `started learning ${languages[lang]}`
				toastSuccess(
					`Phrase added to the library! You've ${deckAction} and the phrase will appear in your next review.`
				)
			} else if (createdCard) {
				toastSuccess(
					'New phrase has been added to the public library and will appear in your next review'
				)
			} else {
				toastSuccess(
					'Phrase has been added to the public library (not added to your deck)'
				)
			}
		},
		onError: (error) => {
			toastError(
				`There was an error submitting this new phrase: ${error.message}`
			)
			console.log(`Error:`, error)
		},
	})

	const schema = useMemo(() => createAddPhraseSchema(lang), [lang])
	const form = useAppForm({
		defaultValues: {
			phrase_text: searchPhrase,
			translation_text: '',
			translation_lang: preferredTranslationLang,
			only_reverse: false,
		},
		validators: { onChange: schema },
		onSubmit: async ({ value }) => {
			await addPhraseMutation.mutateAsync(value)
		},
	})

	return (
		<RequireAuth message="You need to be logged in to add new phrases.">
			<main data-testid="add-phrase-page" style={style}>
				<Card>
					<CardHeader>
						<CardTitle>Add A Phrase</CardTitle>
						<CardDescription>
							Search for a phrase or add a new one to your deck.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form
							data-testid="add-phrase-form"
							noValidate
							onSubmit={(e) => {
								e.preventDefault()
								e.stopPropagation()
								void form.handleSubmit()
							}}
							className="mt-2 space-y-4"
						>
							<form.AppField name="phrase_text">
								{(field) => (
									<field.TextareaInput
										label={`Text of the Phrase (in ${languages[lang]})`}
										placeholder="The text of the phrase to learn"
									/>
								)}
							</form.AppField>

							<form.AppField name="translation_text">
								{(field) => (
									<field.TextareaInput
										label="Translation"
										placeholder="Enter the translation"
									/>
								)}
							</form.AppField>

							<form.AppField name="translation_lang">
								{() => <TranslationLanguageField phraseLang={lang} />}
							</form.AppField>

							<form.Subscribe selector={(s) => s.values.phrase_text}>
								{(phraseText) => (
									<UrlSync phraseText={phraseText} currentText={text} />
								)}
							</form.Subscribe>

							<form.Subscribe
								selector={(s) => ({
									phraseText: s.values.phrase_text,
									translationText: s.values.translation_text,
									onlyReverse: s.values.only_reverse,
								})}
							>
								{({ phraseText, translationText, onlyReverse }) =>
									phraseText || translationText ? (
										<div className="space-y-3 pt-2">
											<Label className="text-muted-foreground text-sm">
												Review card previews
											</Label>
											<div className="grid gap-3 @lg:grid-cols-2">
												<div
													className={`bg-card rounded-lg border p-3 transition-opacity ${onlyReverse ? 'opacity-40' : ''}`}
												>
													<div className="text-muted-foreground mb-2 flex items-center justify-between text-xs font-medium tracking-wide uppercase">
														<span className="inline-flex items-center gap-1">
															Recognition Review{' '}
															<Lightbulb className="size-3" />
														</span>
														{onlyReverse && (
															<span className="text-muted-foreground text-xs normal-case">
																(disabled)
															</span>
														)}
													</div>
													<div className="space-y-2">
														<div className="text-foreground font-medium">
															{phraseText || (
																<span className="text-muted-foreground italic">
																	Phrase text...
																</span>
															)}
														</div>
														<Separator />
														<div className="text-muted-foreground text-sm">
															{translationText || (
																<span className="italic">Translation...</span>
															)}
														</div>
													</div>
												</div>

												<div className="bg-card rounded-lg border p-3">
													<div className="text-muted-foreground mb-2 inline-flex items-center gap-1 text-xs font-medium tracking-wide uppercase">
														Recall Review <Brain className="size-3" />
													</div>
													<div className="space-y-2">
														<div className="text-foreground font-medium">
															{translationText || (
																<span className="text-muted-foreground italic">
																	Translation...
																</span>
															)}
														</div>
														<Separator />
														<div className="text-muted-foreground text-sm">
															{phraseText || (
																<span className="italic">Phrase text...</span>
															)}
														</div>
													</div>
												</div>
											</div>

											<div className="flex items-center gap-2">
												<form.AppField name="only_reverse">
													{(field) => (
														<Checkbox
															id="only_reverse"
															checked={field.state.value}
															className="mb-1"
															onCheckedChange={(checked) => {
																field.handleChange(checked === true)
																field.handleBlur()
															}}
														/>
													)}
												</form.AppField>
												<Label
													htmlFor="only_reverse"
													className="text-muted-foreground cursor-pointer text-sm font-normal"
												>
													Only recall reviews make sense for this phrase
												</Label>
											</div>
										</div>
									) : null
								}
							</form.Subscribe>

							{showDeckCheckbox && (
								<Item variant="outline">
									<ItemMedia>
										<Checkbox
											id="create-deck"
											checked={shouldCreateOrReactivateDeck}
											className="mt-2 mb-3"
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
											{hasArchivedDeck
												? `Re-activate ${languages[lang]} deck`
												: `Start learning ${languages[lang]}?`}
										</Label>
									</ItemContent>
								</Item>
							)}
							<div className="flex w-full flex-col justify-between gap-2 pt-8 @xl:flex-row">
								<form.AppForm>
									<form.SubmitButton>
										<NotebookPen />
										Save and add another
									</form.SubmitButton>
								</form.AppForm>
								<Link
									to="/learn/$lang/feed"
									params={{ lang }}
									search={{ search: true }}
									className={buttonVariants({ variant: 'soft' })}
								>
									<Search size={16} />
									Search phrases
								</Link>

								<Link
									to="/learn/$lang/bulk-add"
									from={Route.fullPath}
									data-testid="bulk-add-link"
									className={buttonVariants({ variant: 'soft' })}
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

/**
 * Pushes the current phrase text into the route's `text` search param,
 * debounced. Rendered inside <form.Subscribe> so it sees value changes
 * without forcing the parent form to re-render on every keystroke.
 */
function UrlSync({
	phraseText,
	currentText,
}: {
	phraseText: string
	currentText: string | undefined
}) {
	const navigate = Route.useNavigate()
	const debouncedText = useDebounce(phraseText, 300)
	useEffect(() => {
		if (debouncedText !== currentText) {
			void navigate({
				replace: true,
				search: (search: SearchParams) => ({
					...search,
					text: debouncedText || undefined,
				}),
				params: true,
			})
		}
	}, [currentText, debouncedText, navigate])
	return null
}
