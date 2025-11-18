import {
	BookOpenCheck,
	ChartSpline,
	Hourglass,
	TriangleAlert,
	WalletCards,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ago } from '@/lib/dayjs'
import { useDeckMeta, useDeckPids } from '@/hooks/use-deck'

export function DeckStatsBadges({ lang }: { lang: string }) {
	const { data: deckMeta } = useDeckMeta(lang)
	const { data: deckPids } = useDeckPids(lang)
	return !deckPids || !deckMeta ?
			null
		:	<>
				{deckPids?.today_active ?
					<Badge variant="outline">
						<Hourglass />{' '}
						{deckPids.today_active.length + deckMeta.daily_review_goal} cards
						for today
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
}
