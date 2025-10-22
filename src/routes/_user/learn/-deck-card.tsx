import { Link } from '@tanstack/react-router'

import type { UseOneDecksType } from '@/hooks/use-deck'
import { Archive, Rocket, HouseHeart, BookOpenText } from 'lucide-react'
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button-variants'
import { ArchiveDeckButton } from './-archive-deck-button'
import { cn } from '@/lib/utils'
import { DeckStatsBadges } from '@/components/stats-badges'
import { getThemeCss } from '@/lib/deck-themes'

export function DeckCard({ deck }: { deck: UseOneDecksType }) {
	return (
		<div style={getThemeCss(deck.theme)}>
			<Card className="@container relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5">
				<CardHeader className="from-primary/10 to-primary-foresoft/30 flex flex-row items-center justify-between gap-6 bg-gradient-to-br p-4 text-white">
					<Link
						className="grow"
						to="/learn/$lang"
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						params={{ lang: deck.lang }}
					>
						<CardTitle className="text-primary-foresoft flex flex-row justify-between gap-2 text-xl">
							<span>{deck.language}</span>
						</CardTitle>
					</Link>
					<span className="flex items-center justify-between gap-2">
						{deck.archived ?
							<Badge variant="secondary">
								<Archive />
								Archived
							</Badge>
						:	<Link
								to="/learn/$lang/review"
								className={buttonVariants({ size: 'icon' })}
								// oxlint-disable-next-line jsx-no-new-object-as-prop
								params={{ lang: deck.lang }}
							>
								<Rocket />
							</Link>
						}
					</span>
				</CardHeader>

				<CardContent className="space-y-2 p-4">
					<div className="flex flex-wrap gap-2">
						<DeckStatsBadges lang={deck.lang} />
					</div>
				</CardContent>
				<CardFooter className="block w-full space-y-4 p-4 pt-0">
					<div className="flex flex-row flex-wrap gap-2">
						{deck.archived ?
							<ArchiveDeckButton
								className="w-full grow basis-60"
								lang={deck.lang}
								archived={deck.archived}
							/>
						:	<Link
								to="/learn/$lang"
								className={cn(
									buttonVariants({ variant: 'secondary' }),
									'grow basis-40'
								)}
								// oxlint-disable-next-line jsx-no-new-object-as-prop
								params={{ lang: deck.lang }}
							>
								<HouseHeart />
								Deck Home
							</Link>
						}
						{!deck.archived ?
							<Link
								to="/learn/$lang/library"
								className={cn(
									buttonVariants({ variant: 'secondary' }),
									`grow basis-60`
								)}
								// oxlint-disable-next-line jsx-no-new-object-as-prop
								params={{ lang: deck.lang }}
							>
								<BookOpenText />
								Explore Library
							</Link>
						:	null}
					</div>
					{/* Subtle stats footer */}
					<div className="text-muted-foreground border-t pt-2 text-xs">
						{deck.cards_active + deck.cards_learned} total cards •{' '}
						{!deck.cards_learned ?
							`0 mastered`
						:	`${(
								(100 * deck.cards_learned) /
								(deck.cards_learned + deck.cards_active)
							).toFixed(0)} % mastered`
						}
					</div>
				</CardFooter>
			</Card>
		</div>
	)
}
