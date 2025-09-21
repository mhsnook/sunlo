import type { DeckMeta } from '@/types/main'
import {
	BookOpenCheck,
	ChartSpline,
	TriangleAlert,
	WalletCards,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ago } from '@/lib/dayjs'

export function StatsBadges({ deckMeta }: { deckMeta: DeckMeta }) {
	return (
		<>
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
