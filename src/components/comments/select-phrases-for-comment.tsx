import { useState } from 'react'
import { Paperclip, Plus, Search } from 'lucide-react'

import type { uuid } from '@/types/main'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
	useLanguagePhrases,
	useLanguagePhrasesSearch,
} from '@/features/phrases/hooks'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
	Dialog,
	DialogContent,
	DialogDescription,
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
	/** Extra classes for the trigger button */
	className?: string
	/** Render the trigger as a card-shaped dashed + button instead of a pill button */
	cardShape?: boolean
}

const DEFAULT_MAX_PHRASES = 4

export function SelectPhrasesForComment({
	lang,
	selectedPhraseIds,
	onSelectionChange,
	maxPhrases = DEFAULT_MAX_PHRASES,
	triggerText = 'Suggest a flashcard',
	triggerMaxText = 'Maximum flashcards reached',
	className,
	cardShape = false,
}: SelectPhrasesForCommentProps) {
	const [searchText, setSearchText] = useState('')
	const [phraseDialogOpen, setPhraseDialogOpen] = useState(false)
	const [showCreateForm, setShowCreateForm] = useState(false)

	const { data: searchResults } = useLanguagePhrasesSearch(
		lang,
		searchText || undefined
	)
	const { data: allPhrases } = useLanguagePhrases(lang)
	const filteredPhrases = searchText ? searchResults : allPhrases

	const effectiveMax = maxPhrases ?? Infinity

	const handleToggle = (phraseId: uuid) => {
		if (selectedPhraseIds.includes(phraseId)) {
			onSelectionChange(selectedPhraseIds.filter((id) => id !== phraseId))
		} else {
			if (selectedPhraseIds.length >= effectiveMax) return
			onSelectionChange([...selectedPhraseIds, phraseId])
			setPhraseDialogOpen(false)
		}
	}

	const handlePhraseCreated = (phraseId: string) => {
		if (selectedPhraseIds.length < effectiveMax) {
			onSelectionChange([...selectedPhraseIds, phraseId])
		}
		setShowCreateForm(false)
		setPhraseDialogOpen(false)
	}

	const isMaxReached = selectedPhraseIds.length >= effectiveMax

	const countDisplay =
		maxPhrases === null ?
			`${selectedPhraseIds.length} selected`
		:	`${selectedPhraseIds.length}/${maxPhrases}`

	const triggerButton =
		cardShape ?
			<button
				type="button"
				disabled={isMaxReached}
				data-testid="open-phrase-picker"
				className="border-2-lo-primary text-muted-foreground hover:bg-1-lo-primary hover:text-7-mid-primary hover:border-4-mlo-primary flex h-30 min-w-50 basis-50 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed transition-colors disabled:pointer-events-none disabled:opacity-50"
			>
				<Plus className="h-6 w-6" />
			</button>
		:	<Button
				type="button"
				variant="soft"
				size="sm"
				disabled={isMaxReached}
				data-testid="open-phrase-picker"
				className={className}
			>
				<Paperclip className="h-4 w-4" />
				{isMaxReached ? triggerMaxText : triggerText}
			</Button>

	return (
		<Dialog open={phraseDialogOpen} onOpenChange={setPhraseDialogOpen}>
			<DialogTrigger asChild>{triggerButton}</DialogTrigger>
			<DialogContent className="grid max-h-[98dvh] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden px-4 pt-0 pb-4 sm:px-6 sm:pb-6">
				<DialogHeader className="flex-none border-b p-6 pb-4">
					<DialogTitle>
						{showCreateForm ?
							'Create New Phrase'
						:	`Select Flashcards (${countDisplay})`}
					</DialogTitle>
					<DialogDescription>
						{showCreateForm ?
							'Add a new phrase to the library'
						: maxPhrases === null ?
							'Select flashcards to add'
						:	`Choose up to ${maxPhrases} flashcards`}
					</DialogDescription>
					{!showCreateForm && (
						<div className="relative mt-2">
							<Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
							<Input
								type="text"
								placeholder="Search phrases..."
								value={searchText}
								data-testid="phrase-search-input"
								onChange={(e) => setSearchText(e.target.value)}
								className="ps-9"
							/>
						</div>
					)}
				</DialogHeader>

				<div className="min-h-0 overflow-hidden">
					<ScrollArea className="h-full">
						<div className="flex flex-col gap-3 p-6">
							{showCreateForm ?
								<InlinePhraseCreator
									lang={lang}
									onPhraseCreated={handlePhraseCreated}
									onCancel={() => setShowCreateForm(false)}
								/>
							:	<>
									<Button
										type="button"
										variant="dashed-w-full"
										onClick={() => setShowCreateForm(true)}
										className="mb-2"
									>
										<Plus className="h-4 w-4" />
										Create new phrase
									</Button>
									{!filteredPhrases?.length ?
										<p className="text-muted-foreground py-8 text-center">
											No phrases found
										</p>
									:	filteredPhrases
											.filter(
												(phrase) => !selectedPhraseIds.includes(phrase.id)
											)
											.map((phrase) => (
												<button
													key={phrase.id}
													type="button"
													disabled={isMaxReached}
													onClick={() => handleToggle(phrase.id)}
													data-name="phrase-picker-item"
													data-key={phrase.id}
													className="hover:bg-muted/50 w-full cursor-pointer rounded-lg border p-3 pb-1 text-start transition-colors disabled:cursor-not-allowed disabled:opacity-50"
												>
													<PhraseTinyCard pid={phrase.id} nonInteractive />
												</button>
											))
									}
								</>
							}
						</div>
					</ScrollArea>
				</div>
			</DialogContent>
		</Dialog>
	)
}
