import { type ReactNode, CSSProperties, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { toastError, toastNeutral, toastSuccess } from '@/components/ui/sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'

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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ShowAndLogError } from '@/components/errors'
import languages from '@/lib/languages'
import { usePreferredTranslationLang } from '@/features/deck/hooks'
import { Separator } from '@/components/ui/separator'
import { SelectOneOfYourLanguages } from '@/components/fields/select-one-of-your-languages'
import { CardResultSimple } from '@/components/cards/card-result-simple'
import { PhraseFullSchema } from '@/features/phrases/schemas'
import { CardMetaSchema, DeckMetaSchema } from '@/features/deck/schemas'
import { LangTagSchema } from '@/features/languages/schemas'
import { langTagsCollection } from '@/features/languages/collections'
import { phrasesCollection } from '@/features/phrases/collections'
import { cardsCollection, decksCollection } from '@/features/deck/collections'
import { Tables } from '@/types/supabase'
import { uuid } from '@/types/main'
import { WithPhrase } from '@/components/with-phrase'
import { useInvalidateFeed } from '@/features/feed/hooks'
import { useDeckMeta, useDecks } from '@/features/deck/hooks'
import { useUserId } from '@/lib/use-auth'
import {
	SpreadsheetImportDialog,
	type SpreadsheetPhrase,
} from '@/components/spreadsheet-import-dialog'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { MultiSelectCreatable } from '@/components/fields/multi-select-creatable'
import { useLanguageTags } from '@/features/languages/hooks'

type BulkAddPhrasesResponse = {
	phrases: Array<Tables<'phrase'>>
	translations: Array<Tables<'phrase_translation'>>
}

type StagedPhrase = {
	id: string
	phrase_text: string
	translations: Array<{ lang: string; text: string }>
	tags: Array<string>
}

export const Route = createFileRoute('/_user/learn/$lang/bulk-add')({
	component: BulkAddPhrasesPage,
	beforeLoad: ({ params: { lang } }) => ({
		titleBar: {
			title: `Bulk Add ${languages[lang]} Phrases`,
		},
	}),
})

const style = { viewTransitionName: `main-area` } as CSSProperties

let nextId = 0
const genId = () => `staged-${++nextId}`

function Kbd({ children }: { children: ReactNode }) {
	return (
		<kbd className="bg-muted text-muted-foreground rounded border px-1.5 py-0.5 text-[10px] leading-none font-medium">
			{children}
		</kbd>
	)
}

function BulkAddPhrasesPage() {
	const { lang } = Route.useParams()
	const userId = useUserId()
	const preferredTranslationLang = usePreferredTranslationLang(lang)

	const [stagedPhrases, setStagedPhrases] = useState<Array<StagedPhrase>>([])
	const [editingPhrase, setEditingPhrase] = useState<StagedPhrase | null>(null)
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

	const invalidateFeed = useInvalidateFeed()

	// Add a single phrase to the staging list
	const addPhrase = (
		phraseText: string,
		translationText: string,
		translationLang: string
	) => {
		if (!phraseText.trim() || !translationText.trim()) return
		setStagedPhrases((prev) => [
			...prev,
			{
				id: genId(),
				phrase_text: phraseText.trim(),
				translations: [{ lang: translationLang, text: translationText.trim() }],
				tags: [],
			},
		])
	}

	// Import from spreadsheet
	const handleSpreadsheetImport = (phrases: Array<SpreadsheetPhrase>) => {
		setStagedPhrases((prev) => [
			...prev,
			...phrases.map((p) => ({ ...p, id: genId() })),
		])
	}

	// Edit a staged phrase
	const updatePhrase = (updated: StagedPhrase) => {
		setStagedPhrases((prev) =>
			prev.map((p) => (p.id === updated.id ? updated : p))
		)
		setEditingPhrase(null)
	}

	// Remove a staged phrase
	const removePhrase = (id: string) => {
		setStagedPhrases((prev) => prev.filter((p) => p.id !== id))
	}

	const submitMutation = useMutation({
		mutationFn: async (phrasesToSubmit: Array<StagedPhrase>) => {
			if (!userId) {
				throw new Error(
					"You must be logged in to add cards; please find the '/login' link in the sidebar, and use it."
				)
			}

			// Handle deck creation/reactivation if needed
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

			const p_phrases = phrasesToSubmit.map((p) => ({
				phrase_text: p.phrase_text,
				translations: p.translations,
				only_reverse: false,
			}))

			const { data, error } = await supabase.rpc('bulk_add_phrases', {
				p_lang: lang,
				p_phrases,
				p_user_id: userId,
			})

			if (error) throw error

			const rpcResult = data as BulkAddPhrasesResponse | null

			// Create cards if appropriate
			const shouldCreateCards =
				(hasActiveDeck || (shouldCreateOrReactivateDeck && showDeckCheckbox)) &&
				shouldAddToMyDeck

			let cards: Array<Tables<'user_card'>> = []
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

			// Add tags for phrases that have them
			type AddTagsReturnValues = {
				tags: Array<Tables<'tag'>>
				phrase_tags: Array<Tables<'phrase_tag'>>
			}
			const tagsByPhraseIndex = new Map<
				number,
				{ result: AddTagsReturnValues | null; tagNames: Array<string> }
			>()

			if (rpcResult?.phrases?.length) {
				const phrasesWithTags = rpcResult.phrases
					.map((phrase, index) => ({
						phrase,
						index,
						tags: phrasesToSubmit[index]?.tags ?? [],
					}))
					.filter(({ tags }) => tags.length > 0)

				const tagResults = await Promise.all(
					phrasesWithTags.map(async ({ phrase, index, tags }) => {
						const { data: tagData } = await supabase.rpc('add_tags_to_phrase', {
							p_phrase_id: phrase.id,
							p_lang: lang,
							p_tags: tags,
						})
						return {
							index,
							result: tagData as AddTagsReturnValues | null,
							tagNames: tags,
						}
					})
				)

				for (const { index, result, tagNames } of tagResults) {
					tagsByPhraseIndex.set(index, { result, tagNames })
				}
			}

			return { rpcResult, newDeck, cards, tagsByPhraseIndex }
		},
		onSuccess: ({ rpcResult, newDeck, cards, tagsByPhraseIndex }) => {
			if (!rpcResult) {
				toastNeutral('No data came back from the database :-/')
				return
			}

			// Update deck collection
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

			// Update tag collection with newly created tags
			for (const [, { result }] of tagsByPhraseIndex) {
				if (result?.tags?.length) {
					result.tags.forEach((t) =>
						langTagsCollection.utils.writeInsert(LangTagSchema.parse(t))
					)
				}
			}

			const phrasesToInsert = rpcResult.phrases.map((p, index) => {
				const tagInfo = tagsByPhraseIndex.get(index)
				let tags: Array<{ id: string; name: string }> = []
				if (tagInfo?.result?.phrase_tags?.length) {
					tags = tagInfo.result.phrase_tags
						.map((pt) => {
							const tag = langTagsCollection.get(pt.tag_id)
							return tag ? { id: tag.id, name: tag.name } : null
						})
						.filter((t): t is { id: string; name: string } => t !== null)
				}

				return PhraseFullSchema.parse({
					...p,
					translations: rpcResult.translations.filter(
						(t) => t.phrase_id === p.id
					),
					tags,
				})
			})

			phrasesToInsert.forEach((p) => phrasesCollection.utils.writeInsert(p))

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
			setStagedPhrases([])

			const cardsMessage =
				cards.length ? ' They will appear in your next review.' : ''
			if (newDeck) {
				const deckAction =
					hasArchivedDeck ?
						`re-activated your ${languages[lang]} deck`
					:	`started learning ${languages[lang]}`
				toastSuccess(
					`${rpcResult.phrases.length} phrases added! You've also ${deckAction}.${cardsMessage}`
				)
			} else {
				toastSuccess(
					`${rpcResult.phrases.length} phrases added successfully!${cardsMessage}`
				)
			}
		},
		onError: (error) => {
			toastError(`Error adding phrases: ${error.message}`)
			console.log('Error', error)
		},
	})

	const handleSubmit = () => {
		if (stagedPhrases.length === 0) return
		submitMutation.mutate(stagedPhrases)
	}

	return (
		<RequireAuth message="You need to be logged in to bulk add phrases.">
			<main style={style} className="flex flex-1 flex-col">
				<Card className="flex flex-1 flex-col">
					<CardHeader>
						<CardTitle>Bulk Add {languages[lang]} Phrases</CardTitle>
						<CardDescription>
							Add phrases one at a time, or paste from a spreadsheet.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-6">
						{/* Inline add bar */}
						<InlineAddBar
							lang={lang}
							defaultTranslationLang={preferredTranslationLang}
							onAdd={addPhrase}
						/>

						{/* Spreadsheet import — hidden on small screens */}
						<div className="hidden items-center gap-3 rounded-lg border border-dashed p-4 @xl:flex">
							<div className="flex-1">
								<p className="text-sm font-medium">Have a spreadsheet?</p>
								<p className="text-muted-foreground text-xs">
									Paste tab-separated data to import many phrases at once.
								</p>
							</div>
							<SpreadsheetImportDialog
								lang={lang}
								onImport={handleSpreadsheetImport}
							/>
						</div>

						{/* Staging list OR empty-state hint */}
						{stagedPhrases.length > 0 ?
							<div className="flex flex-1 flex-col gap-4">
								<div className="space-y-1">
									<div className="flex items-center justify-between">
										<Label className="text-base" data-testid="staged-count">
											{stagedPhrases.length} phrase
											{stagedPhrases.length === 1 ? '' : 's'} ready
										</Label>
										<Button
											variant="ghost"
											size="sm"
											className="text-destructive text-xs"
											onClick={() => setStagedPhrases([])}
										>
											Clear all
										</Button>
									</div>
									<div
										className="divide-y rounded border"
										data-testid="staged-phrases-list"
									>
										{stagedPhrases.map((phrase) => (
											<StagedPhraseRow
												key={phrase.id}
												phrase={phrase}
												onEdit={() => setEditingPhrase(phrase)}
												onRemove={() => removePhrase(phrase.id)}
											/>
										))}
									</div>
								</div>

								{/* Spacer pushes options + submit to bottom */}
								<div className="flex-1" />

								{/* Deck options */}
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
										/>
										<Label htmlFor="add-to-deck" className="cursor-pointer">
											Add these phrases to my deck for review
										</Label>
									</div>
								)}

								{/* Submit */}
								<Button
									className="w-full"
									disabled={submitMutation.isPending}
									onClick={handleSubmit}
									data-testid="submit-staged-phrases"
								>
									{submitMutation.isPending ?
										'Submitting...'
									:	`Submit ${stagedPhrases.length} Phrase${stagedPhrases.length === 1 ? '' : 's'}`
									}
								</Button>
								<ShowAndLogError
									error={submitMutation.error}
									text="There was an error submitting your phrases"
								/>
							</div>
						:	<div
								className="bg-muted/30 flex flex-1 flex-col items-center justify-center gap-3 rounded-lg text-center"
								data-testid="empty-state-hint"
							>
								<p className="text-muted-foreground text-sm">
									Type a phrase and translation above, then press{' '}
									<Kbd>Enter</Kbd> to add it to the list.
								</p>
								<p className="text-muted-foreground text-sm">
									Use <Kbd>Tab</Kbd> to move between fields. Press{' '}
									<Kbd>Esc</Kbd> to clear.
								</p>
							</div>
						}

						{/* Successfully added */}
						{successfullyAddedPhrases.length > 0 && (
							<div className="my-6" data-testid="success-section">
								<Separator className="my-6" />
								<h3 className="mb-4 text-lg font-semibold">
									Successfully Added
								</h3>
								<div className="space-y-2" data-testid="success-phrase-list">
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

				{/* Edit dialog */}
				{editingPhrase && (
					<EditPhraseDialog
						phrase={editingPhrase}
						lang={lang}
						translationLang={preferredTranslationLang}
						onSave={updatePhrase}
						onClose={() => setEditingPhrase(null)}
					/>
				)}
			</main>
		</RequireAuth>
	)
}

// ---------------------------------------------------------------------------
// Inline add bar — two fixed-width columns + language picker + add button
// ---------------------------------------------------------------------------

function InlineAddBar({
	lang,
	defaultTranslationLang,
	onAdd,
}: {
	lang: string
	defaultTranslationLang: string
	onAdd: (phrase: string, translation: string, translationLang: string) => void
}) {
	const [phraseText, setPhraseText] = useState('')
	const [translationText, setTranslationText] = useState('')
	const [translationLang, setTranslationLang] = useState(defaultTranslationLang)
	const phraseRef = useRef<HTMLInputElement>(null)
	const translationRef = useRef<HTMLInputElement>(null)

	const canAdd = phraseText.trim() && translationText.trim()

	const handleAdd = () => {
		if (!canAdd) return
		onAdd(phraseText, translationText, translationLang)
		setPhraseText('')
		setTranslationText('')
		phraseRef.current?.focus()
	}

	const handleClear = () => {
		setPhraseText('')
		setTranslationText('')
		phraseRef.current?.focus()
	}

	return (
		<div data-testid="inline-add-bar" className="space-y-2">
			<div className="flex flex-col gap-2 @lg:flex-row">
				<div className="flex-1 space-y-2">
					<span className="text-muted-foreground border-muted inline-flex h-7 items-center rounded-2xl border px-3 text-xs">
						{languages[lang]}
					</span>
					<Input
						ref={phraseRef}
						value={phraseText}
						onChange={(e) => setPhraseText(e.target.value)}
						placeholder="Type a phrase..."
						onKeyDown={(e) => {
							if (e.key === 'Enter' && phraseText.trim()) {
								e.preventDefault()
								translationRef.current?.focus()
							}
							if (e.key === 'Escape') {
								handleClear()
							}
						}}
						data-testid="inline-phrase-input"
					/>
				</div>
				<div className="flex-1 space-y-2">
					<SelectOneOfYourLanguages
						value={translationLang}
						setValue={setTranslationLang}
						className="h-7 text-xs"
					/>
					<Input
						ref={translationRef}
						value={translationText}
						onChange={(e) => setTranslationText(e.target.value)}
						placeholder="Type translation..."
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault()
								handleAdd()
							}
							if (e.key === 'Escape') {
								handleClear()
							}
						}}
						data-testid="inline-translation-input"
					/>
				</div>
			</div>
			<div className="flex items-center justify-end gap-2 @lg:justify-between">
				<p className="text-muted-foreground hidden items-center gap-1.5 text-xs @lg:flex">
					<Kbd>Tab</Kbd> next field
					<span className="text-muted-foreground/50 mx-1">&middot;</span>
					<Kbd>Enter</Kbd> add phrase
					<span className="text-muted-foreground/50 mx-1">&middot;</span>
					<Kbd>Esc</Kbd> clear
				</p>
				<Button
					type="button"
					variant="soft"
					size="sm"
					onClick={handleAdd}
					disabled={!canAdd}
					data-testid="inline-add-button"
				>
					<Plus className="me-1 size-3.5" /> Add
				</Button>
			</div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Staged phrase row — fixed half-widths, no lang badge
// ---------------------------------------------------------------------------

function StagedPhraseRow({
	phrase,
	onEdit,
	onRemove,
}: {
	phrase: StagedPhrase
	onEdit: () => void
	onRemove: () => void
}) {
	return (
		<div
			className="group hover:bg-muted/30 flex items-center gap-2 px-3 py-2"
			data-testid={`staged-row-${phrase.id}`}
		>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5 @lg:flex-row @lg:items-baseline @lg:gap-2">
				<span
					className="truncate font-medium @lg:w-1/2 @lg:shrink-0"
					data-testid="staged-phrase-text"
				>
					{phrase.phrase_text}
				</span>
				<span className="text-muted-foreground hidden shrink-0 @lg:inline">
					&rarr;
				</span>
				<span
					className="text-muted-foreground truncate text-sm @lg:w-1/2 @lg:shrink-0"
					data-testid="staged-translation-text"
				>
					{phrase.translations.map((t) => t.text).join(', ')}
				</span>
			</div>
			{phrase.tags.length > 0 && (
				<div className="flex shrink-0 gap-1">
					{phrase.tags.map((tag) => (
						<span
							key={tag}
							className="bg-muted truncate rounded px-1.5 py-0.5 text-xs"
						>
							{tag}
						</span>
					))}
				</div>
			)}
			<div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
				<Button
					variant="ghost"
					size="icon"
					className="size-7"
					aria-label="Edit phrase"
					onClick={onEdit}
				>
					<Pencil className="size-3.5" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="size-7"
					aria-label="Remove phrase"
					onClick={onRemove}
				>
					<Trash2 className="text-destructive size-3.5" />
				</Button>
			</div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Edit dialog — uses MultiSelectCreatable for tags
// ---------------------------------------------------------------------------

function EditPhraseDialog({
	phrase,
	lang,
	translationLang,
	onSave,
	onClose,
}: {
	phrase: StagedPhrase
	lang: string
	translationLang: string
	onSave: (updated: StagedPhrase) => void
	onClose: () => void
}) {
	const [phraseText, setPhraseText] = useState(phrase.phrase_text)
	const [translations, setTranslations] = useState(phrase.translations)
	const [selectedTags, setSelectedTags] = useState<Array<string>>(phrase.tags)

	const { data: langTags } = useLanguageTags(lang)
	const tagOptions = (langTags ?? []).map((t) => ({
		value: t.name,
		label: t.name,
	}))

	const updateTranslation = (
		index: number,
		updates: Partial<{ lang: string; text: string }>
	) => {
		setTranslations((prev) =>
			prev.map((t, i) => (i === index ? { ...t, ...updates } : t))
		)
	}

	const addTranslation = () => {
		setTranslations((prev) => [...prev, { lang: translationLang, text: '' }])
	}

	const removeTranslation = (index: number) => {
		if (translations.length <= 1) return
		setTranslations((prev) => prev.filter((_, i) => i !== index))
	}

	const handleSave = () => {
		onSave({
			...phrase,
			phrase_text: phraseText,
			translations: translations.filter((t) => t.text.trim()),
			tags: selectedTags,
		})
	}

	const isValid =
		phraseText.trim().length > 0 &&
		translations.some((t) => t.text.trim().length > 0 && t.lang.length === 3)

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Phrase</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-1">
						<Label>Phrase in {languages[lang]}</Label>
						<Input
							value={phraseText}
							onChange={(e) => setPhraseText(e.target.value)}
							data-testid="edit-phrase-text"
						/>
					</div>

					<div className="space-y-2">
						<Label>Translations</Label>
						{translations.map((t, i) => (
							<div key={i} className="flex items-center gap-2">
								<SelectOneOfYourLanguages
									value={t.lang}
									setValue={(val) => updateTranslation(i, { lang: val })}
									className="w-36"
								/>
								<Input
									className="flex-1"
									value={t.text}
									onChange={(e) =>
										updateTranslation(i, {
											text: e.target.value,
										})
									}
									placeholder="Translation text"
									data-testid={`edit-translation-${i}`}
								/>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => removeTranslation(i)}
									disabled={translations.length <= 1}
									aria-label="Remove translation"
								>
									<Trash2 className="text-destructive size-3.5" />
								</Button>
							</div>
						))}
						<Button
							variant="soft"
							size="sm"
							onClick={addTranslation}
							type="button"
						>
							<Plus className="me-1 size-3.5" /> Add Translation
						</Button>
					</div>

					<div className="space-y-1">
						<Label>Tags</Label>
						<MultiSelectCreatable
							options={tagOptions}
							selected={selectedTags}
							onChange={setSelectedTags}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="neutral" onClick={onClose}>
						Cancel
					</Button>
					<Button
						onClick={handleSave}
						disabled={!isValid}
						data-testid="edit-save-button"
					>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
