import dayjs from 'dayjs'

import type { ReviewStats } from '@/hooks/use-reviews'
import { useInitialiseReviewStore } from '@/hooks/use-review-store'
import languages from '@/lib/languages'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

type ContinueReviewProps = {
	lang: string
	dayString: string
	reviewStats: ReviewStats
}

export function ContinueReview({
	lang,
	dayString,
	reviewStats,
}: ContinueReviewProps) {
	const initLocalReviewState = useInitialiseReviewStore()

	const progressString =
		reviewStats.inferred.stage === 5 ?
			`All ${reviewStats.complete} cards complete!`
		: reviewStats.inferred.stage >= 3 ?
			`${reviewStats.again} remaining out of ${reviewStats.count} cards today`
		:	`${reviewStats.complete} reviewed out of ${reviewStats.count} cards today`
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex flex-row justify-between">
					<div>Continue your {languages[lang]} flash card review</div>
				</CardTitle>
				<CardDescription>{progressString}</CardDescription>
				<Progress value={(100 * reviewStats.complete) / reviewStats.count} />
			</CardHeader>
			<CardContent className="space-y-4 text-xl">
				<p>
					{dayjs(dayString).format('dddd')}: You already have a review in
					progress for today.
				</p>
				{reviewStats.reviewed === 0 ?
					<p>
						You've set up a review with {reviewStats.count} cards in it, but you
						haven't started reviewing yet. Go ahead and get started!
					</p>
				: reviewStats.inferred.stage === 1 ?
					<p>
						Today's review session has {reviewStats.count} cards in it, and
						you've reviewed {reviewStats?.reviewed ?? 0} of them. Continue where
						you left off?
					</p>
				:	<p>
						You've reviewed all {reviewStats.count} cards, but there{' '}
						{reviewStats?.again === 1 ?
							`is one card`
						:	`are ${reviewStats.again} cards`}{' '}
						left that you've asked to see again. Continue where you left off?
					</p>
				}
			</CardContent>
			<CardFooter>
				<Button
					size="lg"
					onClick={() =>
						initLocalReviewState(
							lang,
							dayString,
							reviewStats.count,
							reviewStats.inferred.stage,
							reviewStats.inferred.index
						)
					}
				>
					Continue Review
				</Button>
			</CardFooter>
		</Card>
	)
}
