import { type ReactNode, CSSProperties, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { should } from '@scenetest/checks/react'
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
import languages from '@/lib/languages'
import { newPublicId } from '@/lib/public-id'
import { usePreferredTranslationLang } from '@/features/deck/hooks'
import { Separator } from '@/components/ui/separator'
import { LanguagePicker } from '@/components/fields/language-picker'
import { CardResultSimple } from '@/components/cards/card-result-simple'
import { DeckMetaSchema } from '@/features/deck/schemas'
import { directionsForPhrase } from '@/features/deck/card-directions'
import { langTagsCollection } from '@/features/languages/collections'
import { phrasesCollection } from '@/features/phrases/collections'
import { bulkAddPhrases } from '@/features/phrases/mutations'
import { decksCollection } from '@/features/deck/collections'
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

type StagedPhrase = {
	id: string
	phrase_text: string
	translations: Array<{ lang: string; text: string }>
	tags: Array<string>
}

export const Route = createFileRoute('/_user/learn/$lang/bulk-add')({
	component: BulkAddPhrasesPage,
	staticData: {
		titleBar: ({ params }) => ({
			title: `Bulk Add ${languages[params.lang]} Phrases`,
		}),
	},
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
	const [isSubmitting, setIsSubmitting] = useState(false)

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

	const handleSubmit = async () => {
		if (stagedPhrases.length === 0 || isSubmitting) return
		if (!userId) {
			toastError(
				"You must be logged in to add cards; please find the '/login' link in the sidebar, and use it."
			)
			return
		}
		setIsSubmitting(true)
		try {
			await runSubmit()
		} finally {
			setIsSubmitting(false)
		}
	}

	const runSubmit = async () => {
		if (!userId) return

		const shouldCreateCards =
			(hasActiveDeck || (shouldCreateOrReactivateDeck && showDeckCheckbox)) &&
			shouldAddToMyDeck

		// Deck creation/reactivation runs first — cards FK into a deck row.
		let newDeck: Tables<'user_deck'> | null = null
		if (showDeckCheckbox && shouldCreateOrReactivateDeck) {
			try {
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
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err)
				toastError(`Error setting up deck: ${message}`)
				console.log('Error', err)
				return
			}
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
		}

		// Resolve tag IDs across the whole batch, so a name that's new and
		// appears on multiple phrases gets one shared uuid (and one tag row).
		const tagIdByName = new Map<string, { id: uuid; isNew: boolean }>()
		for (const staged of stagedPhrases) {
			for (const name of staged.tags) {
				if (tagIdByName.has(name)) continue
				const existing = langTagsCollection.toArray.find(
					(t) => t.name === name && t.lang === lang
				)
				tagIdByName.set(name, {
					id: existing?.id ?? crypto.randomUUID(),
					isNew: !existing,
				})
			}
		}
		const newTags = [...tagIdByName.entries()]
			.filter(([, v]) => v.isNew)
			.map(([name, v]) => ({ id: v.id, name }))

		const actionPhrases = stagedPhrases.map((staged) => {
			const phraseId = crypto.randomUUID()
			const publicId = newPublicId()
			const onlyReverse = false
			const cards = shouldCreateCards
				? directionsForPhrase(onlyReverse).map((direction) => ({
						id: crypto.randomUUID(),
						direction: direction as 'forward' | 'reverse',
					}))
				: []
			return {
				phraseId,
				publicId,
				text: staged.phrase_text,
				onlyReverse,
				translations: staged.translations.map((t) => ({
					id: crypto.randomUUID(),
					lang: t.lang,
					text: t.text,
				})),
				cards,
				tagIds: staged.tags.map((name) => tagIdByName.get(name)!.id),
			}
		})

		const tx = bulkAddPhrases({
			lang,
			uid: userId,
			newTags,
			phrases: actionPhrases,
		})
		try {
			await tx.isPersisted.promise
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err)
			toastError(`Error adding phrases: ${message}`)
			console.log('Error', err)
			return
		}

		const phraseIds = actionPhrases.map((p) => p.phraseId)
		should(
			'bulk add wrote every submitted phrase into phrasesCollection',
			phraseIds.every((id) => phrasesCollection.has(id)),
			{ count: phraseIds.length }
		)

		invalidateFeed(lang)
		setSuccessfullyAddedPhrases((prev) => [...phraseIds, ...prev])
		setStagedPhrases([])

		const cardsMessage = shouldCreateCards
			? ' They will appear in your next review.'
			: ''
		if (newDeck) {
			const deckAction = hasArchivedDeck
				? `re-activated your ${languages[lang]} deck`
				: `started learning ${languages[lang]}`
			toastSuccess(
				`${actionPhrases.length} phrases added! You've also ${deckAction}.${cardsMessage}`
			)
		} else {
			toastSuccess(
				`${actionPhrases.length} phrases added successfully!${cardsMessage}`
			)
		}
	}

	return (
		<RequireAuth message="You need to be logged in to bulk add phrases.">
			<main
				data-testid="bulk-add-page"
				style={style}
				className="flex flex-1 flex-col"
			>
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
						{stagedPhrases.length > 0 ? (
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
											data-testid="clear-staged-phrases"
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
											{hasArchivedDeck
												? `Re-activate ${languages[lang]} deck`
												: `Start learning ${languages[lang]}`}
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
									disabled={isSubmitting}
									onClick={() => void handleSubmit()}
									data-testid="submit-staged-phrases"
								>
									{isSubmitting
										? 'Submitting...'
										: `Submit ${stagedPhrases.length} Phrase${stagedPhrases.length === 1 ? '' : 's'}`}
								</Button>
							</div>
						) : (
							<div
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
						)}

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
					<LanguagePicker
						value={translationLang}
						setValue={setTranslationLang}
						className="h-7 py-0 text-xs"
						disabled={[lang]}
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
					data-testid="edit-staged-phrase"
					onClick={onEdit}
				>
					<Pencil className="size-3.5" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="size-7"
					aria-label="Remove phrase"
					data-testid="remove-staged-phrase"
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
	const [translations, setTranslations] = useState(() =>
		phrase.translations.map((t) => ({ ...t, _key: crypto.randomUUID() }))
	)
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
		setTranslations((prev) => [
			...prev,
			{ _key: crypto.randomUUID(), lang: translationLang, text: '' },
		])
	}

	const removeTranslation = (index: number) => {
		if (translations.length <= 1) return
		setTranslations((prev) => prev.filter((_, i) => i !== index))
	}

	const handleSave = () => {
		onSave({
			...phrase,
			phrase_text: phraseText,
			translations: translations
				.filter((t) => t.text.trim())
				.map(({ _key, ...rest }) => rest),
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
							<div key={t._key} className="flex items-center gap-2">
								<LanguagePicker
									value={t.lang}
									setValue={(val) => updateTranslation(i, { lang: val })}
									className="w-44"
									disabled={[lang]}
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
