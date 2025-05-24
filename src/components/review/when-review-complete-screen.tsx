import { DailyCacheKey, pids } from '@/types/main'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import SuccessCheckmark from '@/components/success-checkmark'
import {
	countAgainCards,
	countUnreviewedCards,
	setAgainPids,
} from '@/lib/use-reviewables'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

export function WhenComplete({
	pids,
	dailyCacheKey,
	goToSkipped,
}: {
	pids: pids
	dailyCacheKey: DailyCacheKey
	goToSkipped: () => void
}) {
	const [doneWithFirstReview, setDoneWithFirstReview] = useState<boolean>(false)
	const [goingBackToSkipped, setGoingBackToSkipped] = useState<boolean>(false)
	const unreviewedCount = countUnreviewedCards(pids, dailyCacheKey)
	const againCount = countAgainCards(pids, dailyCacheKey)
	const navigate = useNavigate({ from: '/learn/$lang/review/go' })
	const goToTheLoop = () => {
		setAgainPids(dailyCacheKey)
		// goToLoop()
		navigate({ from: '/learn/$lang/review/agains' })
	}
	return (
		<Card className="mx-auto flex h-[80vh] w-full flex-col">
			<CardContent className="flex grow flex-col items-center justify-center gap-6 pt-0 pb-16">
				{unreviewedCount && !goingBackToSkipped && !doneWithFirstReview ?
					<>
						<h2 className="text-2xl font-bold">Almost there!</h2>
						<p className="text-center text-lg">
							You've completed your first pass, but there are still
							{unreviewedCount} cards you haven't reviewed yet. Let's go back
							and finish them &mdash; you can do it!
						</p>
						<Button
							size="lg"
							onClick={() => {
								setGoingBackToSkipped(true)
								goToSkipped()
							}}
						>
							Review Skipped cards ({unreviewedCount})
						</Button>
						<Button
							size="lg"
							variant="secondary"
							onClick={() => setDoneWithFirstReview(true)}
						>
							Let's move on
						</Button>
					</>
				: againCount && (doneWithFirstReview || goingBackToSkipped) ?
					<Button onClick={goToTheLoop}>Review ({againCount})</Button>
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
