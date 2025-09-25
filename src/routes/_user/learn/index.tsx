import { createFileRoute, Link } from '@tanstack/react-router'
import { Archive, ChevronsRight, HeartPlus } from 'lucide-react'

import { useProfile } from '@/hooks/use-profile'
import { DeckCard } from './-deck-card'
import { buttonVariants } from '@/components/ui/button-variants'
import { GarlicBroccoli } from '@/components/garlic'

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
					<div className="grid grid-cols-1 gap-6 @xl:grid-cols-2">
						{activeDecks.map((lang) => (
							<DeckCard key={lang} deck={decksMap[lang]} />
						))}
					</div>
					<Link
						className="s-link-muted flex flex-row items-center gap-1 text-sm"
						to="/learn/archived"
					>
						<Archive size={14} />
						<span>View archived decks</span>{' '}
						<ChevronsRight className="h-5 w-4" />
					</Link>
				</>
			:	<div className="px-4 @lg:px-6 @xl:px-8">
					{deckLanguages.length ?
						<AllDecksArchived />
					:	<NoDecks />}
				</div>
			}
		</main>
	)
}

function NoDecks() {
	return (
		<div className="space-y-6 py-6 text-center">
			<GarlicBroccoli />
			<p className="text-muted-foreground mb-4">
				You aren't learning any languages yet...
			</p>

			<Link to="/learn/add-deck" className={buttonVariants({ size: 'lg' })}>
				<Archive size={14} /> Start learning
				<ChevronsRight className="h-6 w-5" />
			</Link>
		</div>
	)
}

function AllDecksArchived() {
	return (
		<div className="py-12 text-center">
			<h3 className="mb-2 text-lg font-bold">No Active Decks</h3>
			<p className="text-muted-foreground mb-4">
				All your decks have been archived. Restore some to start studying, or
				start learning a new language deck.
			</p>

			<div className="mx-auto grid max-w-100 grid-cols-1 gap-4">
				<Link to="/learn/add-deck" className={buttonVariants({ size: 'lg' })}>
					<HeartPlus size={14} /> Start a new language{' '}
					<ChevronsRight className="h-6 w-5" />
				</Link>
				<Link
					to="/learn/archived"
					className={buttonVariants({ variant: 'secondary', size: 'lg' })}
				>
					<Archive size={14} /> View archived decks{' '}
					<ChevronsRight className="h-6 w-5" />
				</Link>
			</div>
		</div>
	)
}
