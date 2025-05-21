import { pids } from '@/types/main'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import SuccessCheckmark from '@/components/success-checkmark'
import {
	countAgainCards,
	countSkippedCards,
	countUnfinishedCards,
	resetExtrasPids,
} from '@/lib/use-reviewables'

export function WhenComplete({
	pids,
	dailyCacheKey,
	go,
}: {
	pids: pids
	dailyCacheKey: Array<string>
	go: () => void
}) {
	const skippedCount = countSkippedCards(pids, dailyCacheKey)
	const againCount = countAgainCards(pids, dailyCacheKey)
	const unfinishedCount = countUnfinishedCards(pids, dailyCacheKey)
	const goBackAndStartAgain = () => {
		resetExtrasPids(dailyCacheKey)
		go()
	}
	return (
		<Card className="mx-auto flex h-[80vh] w-full flex-col">
			<CardContent className="flex grow flex-col items-center justify-center gap-6 pt-0 pb-16">
				{unfinishedCount ?
					<>
						<h2 className="text-2xl font-bold">Almost there!</h2>
						<p className="text-center text-lg">
							You're at the end of the queue, but there are still{' '}
							{skippedCount ?
								<>{skippedCount} cards you skipped over</>
							:	null}
							{skippedCount && againCount ?
								<>, and </>
							:	null}
							{againCount ?
								<>{againCount} cards you asked to see again</>
							:	null}
							. Let's go back and finish them &mdash; you can do it!
						</p>
						<Button size="lg" onClick={goBackAndStartAgain}>
							Review unfinished cards ({unfinishedCount})
						</Button>
					</>
				:	<>
						<h2 className="text-2xl font-bold">Good work!</h2>
						<p className="text-lg">You've completed your review for today.</p>
						<SuccessCheckmark />
					</>
				}
			</CardContent>
		</Card>
	)
}
