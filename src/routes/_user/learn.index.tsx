import { createFileRoute, Link } from '@tanstack/react-router'
import { Archive, ChevronsRight } from 'lucide-react'

import { useProfile } from '@/lib/use-profile'
import { DeckCard } from '@/components/learn/deck-card'

export const Route = createFileRoute('/_user/learn/')({
	component: Page,
})

export default function Page() {
	const { data: profile } = useProfile()
	if (!profile) return null
	const { decksMap, deckLanguages } = profile
	const activeDecks = deckLanguages.filter((lang) => !decksMap[lang].archived)

	return (
		<main className="w-full space-y-6">
			{activeDecks.length > 0 ?
				<>
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-medium">Ready to study</h2>
						<span className="text--foreground text-sm">
							{activeDecks.length} deck
							{activeDecks.length !== 1 ? 's' : ''}
						</span>
					</div>
					<div className="grid grid-cols-1 gap-6 @xl:grid-cols-2">
						{activeDecks.map((lang) => (
							<DeckCard key={lang} deck={decksMap[lang]} />
						))}
					</div>
					<Link className="s-link-muted" to="/learn/archived">
						<span>View archived decks</span>{' '}
						<ChevronsRight className="h-5 w-4" />
					</Link>
				</>
			:	<div className="py-12 text-center">
					<div className="text-muted-foreground mb-4">
						<Archive className="mx-auto h-12 w-12" />
					</div>
					<h3 className="mb-2 text-lg font-medium">No active decks</h3>
					<p className="text-muted-foreground mb-4">
						All your decks have been archived. Restore some to start studying!
					</p>
					<span>
						<Link
							className="s-link flex flex-row justify-center"
							to="/learn/archived"
						>
							View archived decks <ChevronsRight className="h-6 w-5" />
						</Link>
					</span>
				</div>
			}
		</main>
	)
}
