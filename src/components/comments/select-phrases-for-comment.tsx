import { useState } from 'react'
import { Paperclip, Plus, Search } from 'lucide-react'

import type { uuid } from '@/types/main'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { useLanguagePhrasesSearch } from '@/hooks/use-language'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog'
import { PhraseTinyCard } from '@/components/cards/phrase-tiny-card'
import { InlinePhraseCreator } from '@/components/phrases/inline-phrase-creator'

interface SelectPhrasesForCommentProps {
	lang: string
	selectedPhraseIds: uuid[]
	onSelectionChange: (phraseIds: uuid[]) => void
	/** Maximum phrases allowed. Defaults to 4 for comments. Set to null for no limit. */
	maxPhrases?: number | null
	/** Custom trigger button text when no phrases selected */
	triggerText?: string
	/** Custom trigger button text when max is reached */
	triggerMaxText?: string
}

const DEFAULT_MAX_PHRASES = 4

export function SelectPhrasesForComment({
	lang,
	selectedPhraseIds,
	onSelectionChange,
	maxPhrases = DEFAULT_MAX_PHRASES,
	triggerText = 'Suggest a phrase',
	triggerMaxText = 'Maximum flashcards reached',
}: SelectPhrasesForCommentProps) {
	const [searchText, setSearchText] = useState('')
	const [phraseDialogOpen, setPhraseDialogOpen] = useState(false)
	const [showCreateForm, setShowCreateForm] = useState(false)

	// Get all phrases for the language
	const { data: filteredPhrases } = useLanguagePhrasesSearch(lang, searchText)

	const effectiveMax = maxPhrases ?? Infinity

	const handleToggle = (phraseId: uuid) => {
		if (selectedPhraseIds.includes(phraseId)) {
			onSelectionChange(selectedPhraseIds.filter((id) => id !== phraseId))
		} else {
			if (selectedPhraseIds.length >= effectiveMax) {
				return // Don't allow more than max
			}
			onSelectionChange([...selectedPhraseIds, phraseId])
		}
	}

	const handlePhraseCreated = (phraseId: string) => {
		// Auto-add the newly created phrase to selection
		if (selectedPhraseIds.length < effectiveMax) {
			onSelectionChange([...selectedPhraseIds, phraseId])
		}
		setShowCreateForm(false)
		// Close the dialog immediately, assuming this is the only phrase being added
		setPhraseDialogOpen(false)
	}

	const isMaxReached = selectedPhraseIds.length >= effectiveMax

	// Format the count display
	const countDisplay =
		maxPhrases === null ?
			`${selectedPhraseIds.length} selected`
		:	`${selectedPhraseIds.length}/${maxPhrases}`

	return (
		<Dialog open={phraseDialogOpen} onOpenChange={setPhraseDialogOpen}>
			<DialogTrigger asChild>
				<Button
					type="button"
					variant="outline"
					disabled={isMaxReached}
					data-testid="open-phrase-picker"
				>
					<Paperclip className="mr-2 h-4 w-4" />
					{isMaxReached ? triggerMaxText : triggerText}
				</Button>
			</DialogTrigger>
			<DialogContent className="grid max-h-[98dvh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0">
				<DialogHeader className="flex-none border-b p-6 pb-4">
					<DialogTitle>Select Flashcards ({countDisplay})</DialogTitle>
					<p className="text-muted-foreground text-sm">
						{maxPhrases === null ?
							'Select flashcards to add'
						:	`Choose up to ${maxPhrases} flashcards`}
					</p>

					<div className="relative mt-2">
						<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
						<Input
							type="text"
							placeholder="Search phrases..."
							value={searchText}
							data-testid="phrase-search-input"
							// oxlint-disable-next-line jsx-no-new-function-as-prop
							onChange={(e) => setSearchText(e.target.value)}
							className="pl-9"
						/>
					</div>
				</DialogHeader>

				<div className="min-h-0 overflow-hidden">
					<ScrollArea className="h-full">
						<div className="flex flex-col gap-2 p-6">
							{/* Inline phrase creator */}
							{showCreateForm && (
								<InlinePhraseCreator
									lang={lang}
									onPhraseCreated={handlePhraseCreated}
									// oxlint-disable-next-line jsx-no-new-function-as-prop
									onCancel={() => setShowCreateForm(false)}
								/>
							)}

							{/* Create new phrase button */}
							{!showCreateForm && (
								<Button
									type="button"
									variant="dashed-w-full"
									// oxlint-disable-next-line jsx-no-new-function-as-prop
									onClick={() => setShowCreateForm(true)}
									className="mb-2"
								>
									<Plus className="mr-2 h-4 w-4" />
									Create new phrase
								</Button>
							)}

							{!filteredPhrases?.length ?
								<p className="text-muted-foreground py-8 text-center">
									No phrases found
								</p>
							:	filteredPhrases.map((phrase) => {
									const isSelected = selectedPhraseIds.includes(phrase.id)
									const isDisabled = !isSelected && isMaxReached

									return (
										<label
											key={phrase.id}
											htmlFor={`select-phrase-${phrase.id}`}
											className={`flex items-start gap-3 rounded-lg border p-3 pb-1 transition-colors ${
												isSelected ?
													'border-primary bg-primary/5'
												:	'hover:bg-muted/50'
											} ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
											// oxlint-disable-next-line jsx-no-new-function-as-prop
											onClick={(e) => {
												if (isDisabled) e.preventDefault()
											}}
										>
											<Checkbox
												checked={isSelected}
												disabled={isDisabled}
												id={`select-phrase-${phrase.id}`}
												// oxlint-disable-next-line jsx-no-new-function-as-prop
												onCheckedChange={() => handleToggle(phrase.id)}
												className="mt-1"
											/>
											<div className="flex-1">
												<PhraseTinyCard pid={phrase.id} nonInteractive />
											</div>
										</label>
									)
								})
							}
						</div>
					</ScrollArea>
				</div>

				<DialogFooter className="bg-background flex-none border-t p-6 pt-4">
					<Button
						// oxlint-disable-next-line jsx-no-new-function-as-prop
						onClick={() => setPhraseDialogOpen(false)}
						disabled={selectedPhraseIds.length === 0}
						className="w-full"
						data-testid="add-selected-phrases-button"
					>
						Add {selectedPhraseIds.length} flashcard
						{selectedPhraseIds.length !== 1 ? 's' : ''}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
