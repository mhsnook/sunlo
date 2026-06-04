import { createFileRoute, Link } from '@tanstack/react-router'
import * as z from 'zod'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LangBadge } from '@/components/ui/badge'
import { ShowAndLogError } from '@/components/errors'
import { LanguagePicker } from '@/components/fields/language-picker'
import { useNewDeckMutation } from '@/features/deck/mutations'
import languages from '@/lib/languages'
import { Loader } from '@/components/ui/loader'
import { useDecks } from '@/features/deck/hooks'
import { useDeckLangs } from '@/lib/hooks'
import { RequireAuth } from '@/components/require-auth'

const SearchSchema = z.object({
	lang: z.string().optional(),
})

export const Route = createFileRoute('/_user/learn/add-deck')({
	validateSearch: SearchSchema,
	staticData: {
		titleBar: { title: 'Start A New Deck of Flashcards' },
	},
	component: NewDeckForm,
})

const TITLE = 'What language would you like to learn?'

function NewDeckForm() {
	return (
		<RequireAuth message="You need to be logged in to create a new deck.">
			<NewDeckFormInner />
		</RequireAuth>
	)
}

function NewDeckFormInner() {
	const createNewDeck = useNewDeckMutation()
	const { data: decks, isLoading: decksLoading } = useDecks()
	const deckLangs = useDeckLangs()
	const search = Route.useSearch()

	if (decksLoading) return <Loader />

	const activeDeckLangs =
		decks?.filter((d) => !d.archived).map((d) => d.lang) ?? []
	const archivedDeckLangs =
		decks?.filter((d) => d.archived).map((d) => d.lang) ?? []
	const hasActive = activeDeckLangs.length > 0
	const archivedCount = archivedDeckLangs.length

	return (
		<main>
			<Card>
				<CardHeader>
					<CardTitle>{TITLE}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6" data-testid="add-deck-form">
					{(hasActive || archivedCount > 0) && (
						<div className="space-y-1.5">
							{hasActive && (
								<>
									<p className="text-muted-foreground text-sm">
										You're currently learning
									</p>
									<div
										className="flex flex-wrap gap-2"
										data-testid="current-deck-languages"
									>
										{activeDeckLangs.map((lang) => (
											<LangBadge key={lang} lang={lang} />
										))}
									</div>
								</>
							)}
							{archivedCount > 0 && (
								<Link
									to="/learn/archived"
									className="text-muted-foreground hover:text-foreground inline-block text-xs underline-offset-2 hover:underline"
									data-testid="archived-decks-link"
								>
									{hasActive
										? `and ${archivedCount} more `
										: `${archivedCount} `}
									archived {archivedCount === 1 ? 'deck' : 'decks'}:{' '}
									{archivedDeckLangs.map((l) => l.toUpperCase()).join(', ')}
								</Link>
							)}
						</div>
					)}
					<LanguagePicker
						value={search.lang ?? ''}
						disabled={deckLangs}
						discover
						placeholder="Choose a language to learn…"
						title={TITLE}
						onConfirm={(lang) => createNewDeck.mutate({ lang })}
						confirmLabel={(lang) => `Start learning ${languages[lang]}`}
					/>
					<ShowAndLogError
						text="Problem creating new deck"
						error={createNewDeck.error}
					/>
				</CardContent>
			</Card>
		</main>
	)
}
