import type { CSSProperties } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Archive, ChevronsRight, HeartPlus } from 'lucide-react'

import { useDecks } from '@/features/deck/hooks'
import { buttonVariants } from '@/components/ui/button'
import { ArchivedDeckTile } from './-archived-deck-tile'

export const Route = createFileRoute('/_user/learn/archived')({
	component: Page,
})

const style = { viewTransitionName: `main-area` } as CSSProperties

function Page() {
	const { data: decks } = useDecks()
	if (!decks) return null
	const archivedDecks = decks.filter((d) => d.archived)

	if (archivedDecks.length === 0) {
		return (
			<main
				className="w-full space-y-6"
				style={style}
				data-testid="archived-page-empty"
			>
				<div className="py-12 text-center">
					<Archive className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
					<h3 className="mb-2 text-lg font-medium">No archived decks</h3>
					<p className="text-muted-foreground">
						When you archive decks, they'll appear here for easy restoration.
					</p>
					<Link
						to="/learn"
						className={buttonVariants({ variant: 'soft', className: 'mt-6' })}
					>
						<HeartPlus size={14} /> Back to learning
						<ChevronsRight className="h-5 w-4" />
					</Link>
				</div>
			</main>
		)
	}

	return (
		<main
			className="w-full space-y-6"
			style={style}
			data-testid="archived-page"
		>
			<header className="space-y-1">
				<div className="flex items-center justify-between gap-2">
					<h1 className="text-2xl leading-tight font-bold">Archived decks</h1>
					<span className="text-muted-foreground text-xs">
						{archivedDecks.length} archived
					</span>
				</div>
				<p className="text-muted-foreground text-sm">
					Hidden from your main view. Restore any anytime — your progress is
					preserved.
				</p>
			</header>

			<div
				data-testid="archived-decks-grid"
				className="grid grid-cols-1 gap-3 @sm:grid-cols-2 @xl:grid-cols-3 @4xl:grid-cols-4"
			>
				{archivedDecks.map((deck) => (
					<ArchivedDeckTile key={deck.lang} deck={deck} />
				))}
			</div>
		</main>
	)
}
