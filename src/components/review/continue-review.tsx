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
					<div>Continue your {languages[lang]} flash card review</div>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p>
					{dayjs(dayString).format('dddd')}: You already have a review in
					progress for today.
				</p>
				{stats.reviewed === 0 ?
					<p>
						You've set up a review with {stats.count} cards in it, but you
						haven't started reviewing yet. Go ahead and get started!
					</p>
				: stage === 1 ?
					<p>
						Today's review session has {stats.count} cards in it, and you've
						reviewed {stats?.reviewed ?? 0} of them. Continue where you left
						off?
					</p>
				:	<p>
						You've reviewed all {stats.count} cards at least once, but there{' '}
						{stats?.again === 1 ? `is one card` : `are ${stats.again} cards`}{' '}
						left that you've asked to see again. Continue where you left off?
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
					Continue Review
				</Button>
			</CardFooter>
		</Card>
	)
}
