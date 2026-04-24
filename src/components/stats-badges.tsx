import {
	BookOpenCheck,
	ChartSpline,
	Hourglass,
	TriangleAlert,
	WalletCards,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ago } from '@/lib/dayjs'
import { useDeckMeta, useDeckPids } from '@/features/deck/hooks'

export function DeckStatsBadges({ lang }: { lang: string }) {
	const { data: deckMeta } = useDeckMeta(lang)
	const { data: deckPids } = useDeckPids(lang)
	return !deckPids || !deckMeta ? null : (
		<>
			{deckPids?.today_active ? (
				<Badge
					variant="outline"
					title="Each phrase may include a recognition and a recall card, so the actual card count in the review is typically higher."
				>
					<Hourglass />{' '}
					{deckPids.today_active.length + deckMeta.daily_review_goal} phrases
					for today
				</Badge>
			) : null}
			{deckMeta.count_reviews_7d ? (
				<Badge variant="outline" data-testid="badge-count-reviews-7d">
					<ChartSpline />
					<span>{deckMeta.count_reviews_7d} reviews this week</span>
				</Badge>
			) : (
				<Badge variant="outline" data-testid="badge-no-reviews-7d">
					<TriangleAlert />
					<span>No reviews this week</span>
				</Badge>
			)}
			<Badge variant="outline">
				<WalletCards />
				<span>{deckPids.active.length} active phrases</span>
			</Badge>

			{deckMeta.most_recent_review_at ? (
				<Badge variant="outline" data-testid="badge-most-recent-review">
					<BookOpenCheck />
					<span>{ago(deckMeta.most_recent_review_at)}</span>
				</Badge>
			) : null}
		</>
	)
}
