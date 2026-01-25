import { createFileRoute, Link } from '@tanstack/react-router'
import {
	Archive,
	ChevronsRight,
	Compass,
	HeartPlus,
	UserPlus,
} from 'lucide-react'
import { DeckCard } from './-deck-card'
import { buttonVariants } from '@/components/ui/button'
import { GarlicBroccoli } from '@/components/garlic'
import { FriendProfiles } from '@/components/friend-profiles'
import { useDecks } from '@/hooks/use-deck'
import { useAuth } from '@/lib/use-auth'
import { decksCollection } from '@/lib/collections'
import { CSSProperties } from 'react'

export const Route = createFileRoute('/_user/learn/')({
	component: Page,
	loader: async () => {
		await decksCollection.preload()
	},
})

const style = { viewTransitionName: `main-area` } as CSSProperties

function Page() {
	const { isAuth } = useAuth()
	const { data: decks } = useDecks()
	const activeDecks = decks?.filter((i) => !i.archived)

	// For non-authenticated users, show browse prompt
	if (!isAuth) {
		return (
			<main className="w-full space-y-6" style={style}>
				<div className="px-4 @lg:px-6 @xl:px-8">
					<BrowsePrompt />
				</div>
			</main>
		)
	}

	return (
		<main className="w-full space-y-6" style={style}>
			{activeDecks?.length ?
				<>
					<div
						data-testid="decks-list-grid"
						className="grid grid-cols-1 gap-6 @xl:grid-cols-2"
					>
						{activeDecks.map((d) => (
							<DeckCard key={d.lang} deck={d} />
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
					{decks?.length ?
						<AllDecksArchived />
					:	<NoDecks />}
				</div>
			}
			<FriendProfiles />
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

function BrowsePrompt() {
	return (
		<div className="space-y-6 py-6 text-center">
			<GarlicBroccoli />
			<h2 className="text-xl font-bold">Welcome to Sunlo</h2>
			<p className="text-muted-foreground mb-4">
				Explore community-created flashcards and language learning content.
			</p>

			<div className="mx-auto grid max-w-100 grid-cols-1 gap-4">
				<Link to="/signup" className={buttonVariants({ size: 'lg' })}>
					<UserPlus size={14} /> Create an account
					<ChevronsRight className="h-6 w-5" />
				</Link>
				<Link
					to="/learn/browse"
					className={buttonVariants({ variant: 'secondary', size: 'lg' })}
				>
					<Compass size={14} /> Browse languages
					<ChevronsRight className="h-6 w-5" />
				</Link>
			</div>
		</div>
	)
}
