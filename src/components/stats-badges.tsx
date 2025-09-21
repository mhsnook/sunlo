import type { DeckMeta } from '@/types/main'
import {
	BookOpenCheck,
	ChartSpline,
	Hourglass,
	TriangleAlert,
	WalletCards,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ago } from '@/lib/dayjs'

export function DeckStatsBadges({ deckMeta }: { deckMeta: DeckMeta }) {
	return (
		<>
			{deckMeta.cardsScheduledForToday ?
				<Badge variant="outline">
					<Hourglass />{' '}
					{deckMeta.cardsScheduledForToday + (deckMeta.daily_review_goal ?? 0)}{' '}
					cards for today
				</Badge>
			:	null}
			{deckMeta.count_reviews_7d ?
				<Badge variant="outline">
					<ChartSpline />
					<span>{deckMeta.count_reviews_7d} reviews this week</span>
				</Badge>
			:	<Badge variant="outline">
					<TriangleAlert />
					<span>No reviews this week</span>
				</Badge>
			}
			<Badge variant="outline">
				<WalletCards />
				<span>{deckMeta.cards_active} active cards</span>
			</Badge>

			<Badge variant="outline">
				<BookOpenCheck />
				<span>{ago(deckMeta.most_recent_review_at)}</span>
			</Badge>
		</>
	)
}
