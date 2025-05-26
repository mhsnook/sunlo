import { DailyCacheKey } from '@/types/main'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import SuccessCheckmark from '@/components/success-checkmark'
import { useReviewStageMutation, useReviewState } from '@/lib/use-reviewables'

type ComponentProps = {
	dailyCacheKey: DailyCacheKey
	goToFirstSkipped: () => void
	goToFirstAgain: () => void
}

export function WhenComplete({
	dailyCacheKey,
	goToFirstSkipped,
	goToFirstAgain,
}: ComponentProps) {
	// console.log(reviewStage)
	const {
		data: { reviewStage, unreviewedCount, againCount },
	} = useReviewState(dailyCacheKey)
	const { mutate: setReviewStage } = useReviewStageMutation(dailyCacheKey)

	return (
		<Card className="mx-auto flex h-[80vh] w-full flex-col">
			<CardContent className="flex grow flex-col items-center justify-center gap-6 pt-0 pb-16">
				{(
					unreviewedCount && reviewStage < 2 // usually 1
				) ?
					<>
						<h2 className="text-2xl font-bold">Step 1 complete</h2>
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
								setReviewStage(2)
								goToFirstSkipped()
							}}
						>
							Review Skipped cards ({unreviewedCount})
						</Button>
						<Button
							size="lg"
							variant="link"
							onClick={() => {
								setReviewStage(3)
							}}
						>
							Skip step 2
						</Button>
					</>
				: againCount && reviewStage < 4 ?
					<>
						<h2 className="text-2xl font-bold">Step 3 of 3</h2>
						<p className="text-center text-lg">
							There {againCount === 1 ? 'is 1 card' : `are ${againCount} cards`}{' '}
							that you weren't able to get right and asked to see again.
						</p>
						<Button
							size="lg"
							onClick={() => {
								setReviewStage(4)
								goToFirstAgain()
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
							All of these can help you commit the phase to useable memory
							&ndash; and as always, don't forget to say the phrase outloud! Use
							as many senses as you can.{' '}
						</p>
						<Button variant="link" size="lg" onClick={() => setReviewStage(5)}>
							Skip step 3
						</Button>
					</>
				:	<>
						<h2 className="text-2xl font-bold">Good work!</h2>
						<p className="text-center text-lg">
							You've completed your review for today.
						</p>
						<SuccessCheckmark />
					</>
				}
			</CardContent>
		</Card>
	)
}
