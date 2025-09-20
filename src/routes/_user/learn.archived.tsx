import { createFileRoute } from '@tanstack/react-router'
import { Archive } from 'lucide-react'

import { useProfile } from '@/hooks/use-profile'
import { DeckCard } from '@/components/learn/deck-card'
import Callout from '@/components/ui/callout'

export const Route = createFileRoute('/_user/learn/archived')({
	component: Page,
})

export default function Page() {
	const { data: profile } = useProfile()
	if (!profile) return null
	const { decksMap, deckLanguages } = profile
	const archivedDecks = deckLanguages.filter((lang) => decksMap[lang].archived)

	return (
		<main className="w-full space-y-6">
			{archivedDecks.length > 0 ?
				<>
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-medium">Archived decks</h2>
						<span className="text-muted-foreground me-2 text-sm">
							{archivedDecks.length} archived deck
							{archivedDecks.length !== 1 ? 's' : ''}
						</span>
					</div>
					<Callout Icon={Archive}>
						<h3 className="font-medium">Archived decks</h3>
						<p className="mt-1 text-sm opacity-70">
							These decks are hidden from your main view but can be restored
							anytime. Your progress is safely preserved.
						</p>
					</Callout>

					<div className="grid grid-cols-1 gap-6 @xl:grid-cols-2">
						{archivedDecks.map((lang) => (
							<DeckCard key={lang} deck={decksMap[lang]} />
						))}
					</div>
				</>
			:	<div className="py-12 text-center">
					<div className="text-muted-foreground mb-4">
						<Archive className="mx-auto h-12 w-12" />
					</div>
					<h3 className="mb-2 text-lg font-medium">No archived decks</h3>
					<p className="text-muted-foreground">
						When you archive decks, they'll appear here for easy restoration.
					</p>
				</div>
			}
		</main>
	)
}
