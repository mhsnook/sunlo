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
import {
	Archive,
	Rocket,
	Sprout,
	TriangleAlert,
	BookOpenCheck,
	WalletCards,
	ChartSpline,
} from 'lucide-react'
import { ArchiveDeckButton } from './archive-deck-button'
import { Link } from '@tanstack/react-router'
import { buttonVariants } from '../ui/button-variants'
import { cn } from '@/lib/utils'

export function DeckCard({ deck }: { deck: DeckMeta }) {
	return (
		<Card
			className={`@container relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 ${
				deck.archived ? 'opacity-80' : ''
			}`}
		>
			<Link to="/learn/$lang" params={{ lang: deck.lang! }}>
				<CardHeader className="from-primary bg-gradient-to-br to-violet-800 p-4 text-white">
					<CardTitle className="flex flex-col text-xl">
						<span>{deck.language}</span>
						<span className="flex justify-between">
							<Badge
								variant="outline"
								className="border-white/50 font-bold text-white/70 uppercase"
							>
								<span className="mt-px">{deck.lang}</span>
							</Badge>
							{deck.archived ?
								<Badge
									variant="outline"
									className="border-white/50 font-normal text-white/70"
								>
									<Archive className="mr-1 h-3 w-3" />
									Archived
								</Badge>
							:	null}
						</span>
					</CardTitle>
				</CardHeader>
			</Link>

			<CardContent className="space-y-2 p-4">
				<div className="flex flex-wrap gap-2">
					{deck.count_reviews_7d ?
						<Badge variant="outline">
							<ChartSpline />
							<span>{deck.count_reviews_7d} reviews this week</span>
						</Badge>
					:	<Badge variant="outline">
							<TriangleAlert />
							<span>No reviews this week</span>
						</Badge>
					}
					<Badge variant="outline">
						<WalletCards />
						<span>{deck.cards_active} active cards</span>
					</Badge>

					<Badge variant="outline">
						<BookOpenCheck />
						<span>{ago(deck.most_recent_review_at)}</span>
					</Badge>
				</div>
			</CardContent>
			<CardFooter className="block w-full space-y-4 p-4 pt-0">
				<div className="flex flex-row flex-wrap gap-2">
					{!deck.archived ?
						deck.cards_active ?
							<Link
								to="/learn/$lang/review"
								className={cn(
									buttonVariants({ variant: 'outline-primary' }),
									`grow basis-60`
								)}
								params={{ lang: deck.lang! }}
							>
								<Rocket />
								Study now
							</Link>
						:	<Link
								to="/learn/$lang/library"
								className={cn(
									buttonVariants({ variant: 'outline-primary' }),
									`grow basis-60`
								)}
								params={{ lang: deck.lang! }}
							>
								<Rocket />
								Build your deck
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
								buttonVariants({ variant: 'secondary' }),
								'grow basis-40'
							)}
							params={{ lang: deck.lang! }}
						>
							<Sprout />
							Manage deck
						</Link>
					}
				</div>
				{/* Subtle stats footer */}
				<div className="text-muted-foreground border-t pt-2 text-xs">
					{deck.cards_active! + deck.cards_learned!} total cards •{' '}
					{!deck.cards_learned ?
						`0 mastered`
					:	`${(
							(100 * deck.cards_learned!) /
							(deck.cards_learned! + deck.cards_active!)
						).toFixed(0)} % mastered`
					}
				</div>
			</CardFooter>
		</Card>
	)
}
