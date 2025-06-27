import { DeckMeta } from '@/types/main'
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '../ui/card'
import { Badge } from '../ui/badge'
import { ago } from '@/lib/dayjs'
import { Info, Play } from 'lucide-react'
import { ArchiveDeckButton } from './archive-deck-button'
import { Link } from '@tanstack/react-router'
import { buttonVariants } from '../ui/button-variants'
import { cn } from '@/lib/utils'

export function DeckCard({ deck }: { deck: DeckMeta }) {
	return (
		<Card
			className={`@container relative overflow-hidden transition-all duration-200 hover:scale-[1.02] ${
				deck.archived ? 'opacity-80' : ''
			}`}
		>
			<CardHeader className="from-primary bg-gradient-to-br to-violet-800 text-white">
				<CardTitle>
					{deck.language}{' '}
					<span className="text-sm uppercase opacity-80">{deck.lang}</span>
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-2 py-6">
				<div className="flex items-center justify-between">
					<span className="text-foreground-muted">
						{deck.cards_active} active cards
					</span>
					{deck.archived ?
						<Badge
							variant="secondary"
							className="border-border bg-foreground/20"
						>
							Archived
						</Badge>
					:	null}
				</div>
				<div className="text-foreground-muted text-sm">
					Last studied: {ago(deck.most_recent_review_at)}
				</div>
				<div className="text-foreground-muted text-sm">
					{deck.count_reviews_7d} cards studied in the last 7 days
				</div>
			</CardContent>
			<CardFooter className="flex flex-row flex-wrap gap-2">
				{!deck.archived ?
					deck.cards_active ?
						<Link
							to="/learn/$lang/review"
							className={cn(buttonVariants(), `grow basis-60`)}
							params={{ lang: deck.lang! }}
						>
							Study now
							<Play />
						</Link>
					:	<Link
							to="/learn/$lang/library"
							className={cn(buttonVariants(), `grow basis-60`)}
							params={{ lang: deck.lang! }}
						>
							Build your deck
							<Play />
						</Link>

				:	null}

				{deck.archived ?
					<ArchiveDeckButton
						className="w-full grow basis-60"
						lang={deck.lang!}
						archived={deck.archived}
					/>
				:	<Link
						to="/learn/$lang"
						className={cn(
							buttonVariants({ variant: 'outline' }),
							'grow basis-40'
						)}
						params={{ lang: deck.lang! }}
					>
						View deck
						<Info />
					</Link>
				}
			</CardFooter>
		</Card>
	)
}
