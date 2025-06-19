import {
	getIndexOfNextAgainCard,
	getIndexOfNextUnreviewedCard,
	useInitialiseReviewStore,
} from '@/lib/use-review-store'
import { DailyReviewStateLoaded } from '@/types/main'
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '../ui/card'
import dayjs from 'dayjs'
import { Button } from '../ui/button'
import languages from '@/lib/languages'

type ContinueReviewProps = {
	lang: string
	dayString: string
	prevData: DailyReviewStateLoaded
}

export function ContinueReview({
	lang,
	dayString,
	prevData,
}: ContinueReviewProps) {
	const initLocalReviewState = useInitialiseReviewStore()

	const { manifest, reviewsMap, stats } = prevData

	const stage =
		stats.reviewed < stats.count ? 1
		: stats.again === 0 ? 5
		: 3
	const indexFn =
		stage === 3 ? getIndexOfNextAgainCard : getIndexOfNextUnreviewedCard
	const startingIndex = indexFn(manifest, reviewsMap, -1)

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex flex-row justify-between">
					<div>Get Ready to review your {languages[lang]} cards</div>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p>
					{dayjs(dayString).format('dddd')}: You already have a review in
					progress for today.
				</p>
				{stage === 1 ?
					<p>
						Today's review session has {stats.count} cards in it, and you've
						reviewed {stats?.reviewed ?? 0} of them. Continue where you left
						off?
					</p>
				:	<p>
						Today's review session has {stats.count} cards in it, and there are{' '}
						{stats?.again ?? 0} cards left that you've asked to see again.
						Continue where you left off?
					</p>
				}
			</CardContent>
			<CardFooter>
				<Button
					size="lg"
					onClick={() =>
						initLocalReviewState(lang, dayString, stage, startingIndex)
					}
				>
					Continue
				</Button>
			</CardFooter>
		</Card>
	)
}
