import { Link } from '@tanstack/react-router'

import { Archive, CircleCheck, Rocket, Logs, TableProperties } from 'lucide-react'
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { ArchiveDeckButton } from './-archive-deck-button'
import { cn, todayString } from '@/lib/utils'
import { DeckStatsBadges } from '@/components/stats-badges'
import { getThemeCss } from '@/lib/deck-themes'
import { DeckMetaType } from '@/features/deck/schemas'
import { useActiveReviewRemaining } from '@/features/review/hooks'

function ReviewButton({ lang }: { lang: string }) {
	const remaining = useActiveReviewRemaining(lang, todayString())
	const isDone = remaining === 0
	return (
		<Link
			to="/learn/$lang/review"
			className={cn(
				buttonVariants({ size: 'icon' }),
				isDone && 'bg-5-hi-success hover:bg-6-hi-success'
			)}
			params={{ lang }}
			aria-label={isDone ? 'Review complete' : 'Start review'}
		>
			{isDone ? <CircleCheck /> : <Rocket />}
		</Link>
	)
}

export function DeckCard({ deck }: { deck: DeckMetaType }) {
	return (
		<div style={getThemeCss(deck.theme)} data-key={deck.lang}>
			<Card
				data-testid={`deck-card-${deck.lang}`}
				className="@container relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
			>
				<CardHeader className="from-1-mlo-primary to-2-mid-primary flex flex-row items-center justify-between gap-6 bg-gradient-to-br p-4">
					<Link
						className="grow"
						to="/learn/$lang"
						data-testid="deck-link"
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
						:	<ReviewButton lang={deck.lang} />
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
						:	<>
								<Link
									to="/learn/$lang/feed"
									className={cn(
										buttonVariants({ variant: 'neutral' }),
										`grow basis-40`
									)}
									params={{ lang: deck.lang }}
								>
									<Logs />
									Browse Feed
								</Link>
								<Link
									to="/learn/$lang/manage-deck"
									className={cn(
										buttonVariants({ variant: 'neutral' }),
										`grow basis-40`
									)}
									params={{ lang: deck.lang }}
								>
									<TableProperties />
									Manage Deck
								</Link>
							</>
						}
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
