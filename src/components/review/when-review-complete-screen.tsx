import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import SuccessCheckmark from '@/components/success-checkmark'
import {
	useReviewActions,
	useReviewStage,
	useReviewLang,
	useReviewDayString,
	getIndexOfNextUnreviewedCard,
	getIndexOfNextAgainCard,
} from '@/lib/use-review-store'
import { useReviewsToday, useReviewsTodayStats } from '@/lib/use-reviews'

export function WhenComplete() {
	const lang = useReviewLang()
	const dayString = useReviewDayString()
	const { data: reviewStats } = useReviewsTodayStats(lang, dayString)
	const {
		data: { manifest, reviewsMap },
	} = useReviewsToday(lang, dayString)

	const firstUnreviewedIndex = getIndexOfNextUnreviewedCard(
		manifest,
		reviewsMap,
		-1
	)
	const firstAgainIndex = getIndexOfNextAgainCard(manifest, reviewsMap, -1)
	const stage = useReviewStage()
	const actions = useReviewActions()

	if (!reviewsMap || !manifest.length || !stage) return null

	const unreviewedCount = manifest.length - reviewStats.reviewed
	const againCount = reviewStats.again
	const showWhich =
		unreviewedCount && stage < 2 ? 'a'
		: againCount && stage < 4 ? 'b'
		: 'c'

	return (
		<Card className="mx-auto flex min-h-[80vh] w-full flex-col items-center justify-center pt-12">
			<CardContent className="flex grow flex-col justify-center gap-6">
				{showWhich === 'a' ?
					<>
						<CardTitle className="text-center">Step 2 of 3</CardTitle>
						<p className="text-center text-lg">
							You've completed your first pass, but there{' '}
							{unreviewedCount === 1 ?
								'is still 1 card'
							:	`are still ${unreviewedCount} cards`}{' '}
							you haven't reviewed yet. Let's go back and finish them &mdash;
							you can do it!
						</p>
						<Button
							size="lg"
							onClick={() => {
								actions.gotoReviewUnreviewed(firstUnreviewedIndex)
							}}
						>
							Review Skipped cards ({unreviewedCount})
						</Button>
						<Button
							size="lg"
							variant="link"
							onClick={() => {
								actions.skipReviewUnreviewed()
							}}
						>
							Skip step 2
						</Button>
					</>
				: showWhich === 'b' ?
					<>
						<CardTitle className="text-center">Step 3 of 3</CardTitle>
						<p className="text-center text-lg">
							There {againCount === 1 ? 'is 1 card' : `are ${againCount} cards`}{' '}
							that you weren't able to get right and asked to see again.
						</p>
						<Button
							size="lg"
							onClick={() => {
								actions.gotoReviewAgains(firstAgainIndex)
							}}
						>
							Review cards ({againCount})
						</Button>
						<div>
							<p className="mb-2">
								If these are new cards and you're trying to make these memories
								for the first time, you might want to try one of these tricks:
							</p>
							<ol className="ms-6 list-decimal space-y-2">
								<li>
									Get out a paper and pencil and write the phrase down or draw a
									doodle.
								</li>
								<li>Think of a mnemonic device or a rhyme.</li>
								<li>
									Imagine cartoon character or a funny animal saying the phrase.
								</li>
							</ol>
						</div>
						<p>
							All of these can help you commit the phrase to useable memory
							&ndash; and as always, don't forget to say the phrase outloud! Use
							as many senses as you can.{' '}
						</p>
						<Button
							variant="link"
							size="lg"
							onClick={() => actions.skipReviewAgains()}
						>
							Skip step 3
						</Button>
					</>
				:	<div className="flex h-full flex-col items-center justify-center gap-4 pb-16">
						<CardTitle className="text-center">Step 3 of 3</CardTitle>
						<p className="text-center text-lg">
							You've completed your review for today.
						</p>
						<SuccessCheckmark />
					</div>
				}
			</CardContent>
		</Card>
	)
}
