import { useState } from 'react'
import { Search } from 'lucide-react'

import type { uuid } from '@/types/main'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { CardResultSimple } from '@/components/cards/card-result-simple'
import { useLanguagePhrasesSearch } from '@/hooks/use-language'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SelectPhrasesForCommentProps {
	lang: string
	selectedPhraseIds: uuid[]
	onSelectionChange: (phraseIds: uuid[]) => void
	onDone: () => void
}

const MAX_PHRASES = 4

export function SelectPhrasesForComment({
	lang,
	selectedPhraseIds,
	onSelectionChange,
	onDone,
}: SelectPhrasesForCommentProps) {
	const [searchText, setSearchText] = useState('')

	// Get all phrases for the language
	const { data: filteredPhrases } = useLanguagePhrasesSearch(lang, searchText)

	const handleToggle = (phraseId: uuid) => {
		if (selectedPhraseIds.includes(phraseId)) {
			onSelectionChange(selectedPhraseIds.filter((id) => id !== phraseId))
		} else {
			if (selectedPhraseIds.length >= MAX_PHRASES) {
				return // Don't allow more than MAX_PHRASES
			}
			onSelectionChange([...selectedPhraseIds, phraseId])
		}
	}

	const isMaxReached = selectedPhraseIds.length >= MAX_PHRASES

	return (
		<div className="flex h-full flex-col gap-4 overflow-hidden">
			<div className="bg-background z-10 pb-2">
				<h3 className="text-lg font-semibold">
					Select Flashcards ({selectedPhraseIds.length}/{MAX_PHRASES})
				</h3>
				<p className="text-muted-foreground text-sm">
					Choose up to {MAX_PHRASES} flashcards to attach to your comment
				</p>

				<div className="relative mt-2">
					<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
					<Input
						type="text"
						placeholder="Search phrases..."
						value={searchText}
						// oxlint-disable-next-line jsx-no-new-function-as-prop
						onChange={(e) => setSearchText(e.target.value)}
						className="pl-9"
					/>
				</div>
			</div>

			<div className="min-h-0 flex-1">
				<ScrollArea className="h-120">
					<div className="flex flex-col gap-2 p-1">
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
											<CardResultSimple phrase={phrase} nonInteractive />
										</div>
									</label>
								)
							})
						}
					</div>
				</ScrollArea>
			</div>

			<div className="bg-background sticky bottom-0 z-40 pt-2">
				<Button
					onClick={onDone}
					disabled={selectedPhraseIds.length === 0}
					className="w-full"
				>
					Add {selectedPhraseIds.length} flashcard
					{selectedPhraseIds.length !== 1 ? 's' : ''}
				</Button>
			</div>
		</div>
	)
}
