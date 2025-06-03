import { useCallback, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DailyCacheKey, pids, ReviewStages } from '@/types/main'
import {
	getIndexOfLoopedAgainCard,
	getIndexOfNextUnreviewedCard,
} from '@/lib/use-reviewables'
import { WhenComplete } from '@/components/review/when-review-complete-screen'
import { ReviewSingleCard } from '@/components/review/review-single-card'
import { QueryClient } from '@tanstack/react-query'

interface ThisComponentProps {
	dailyCacheKey: DailyCacheKey
	manifest: pids
	reviewStage: ReviewStages
	queryClient: QueryClient
}

export function FlashCardReviewSession({
	dailyCacheKey,
	manifest,
	reviewStage,
	queryClient,
}: ThisComponentProps) {
	const [currentCardIndex, setCurrentCardIndex] = useState(() =>
		reviewStage < 4 ?
			getIndexOfNextUnreviewedCard(queryClient, dailyCacheKey, manifest, -1)
		:	getIndexOfLoopedAgainCard(queryClient, dailyCacheKey, manifest, -1)
	)

	const navigateCards = useCallback(
		(direction: 'forward' | 'back' | 'next' | 'first' | 'loop') => {
			console.log(`navigateCards running: ${direction}`)
			if (direction === 'first')
				setCurrentCardIndex(() =>
					getIndexOfNextUnreviewedCard(queryClient, dailyCacheKey, manifest, -1)
				)
			if (direction === 'forward') setCurrentCardIndex((i) => i + 1)
			if (direction === 'back') setCurrentCardIndex((i) => i - 1)
			if (direction === 'next')
				setCurrentCardIndex((i) => {
					console.log(`setCurrentCardIndex, ${i}`)
					return getIndexOfNextUnreviewedCard(
						queryClient,
						dailyCacheKey,
						manifest,
						i
					)
				})
			// the loop only applies to again-cards, and we don't want to have to
			// wait a render cycle for the function ref to update to then call it
			if (direction === 'loop')
				setCurrentCardIndex((i) =>
					getIndexOfLoopedAgainCard(queryClient, dailyCacheKey, manifest, i)
				)
		},
		[dailyCacheKey]
	)

	const isComplete = currentCardIndex === manifest.length

	return (
		<div className="flex-col items-center justify-center gap-2 py-2">
			<div className="mb-2 flex flex-col items-center justify-center gap-2">
				<div className="flex min-h-10 flex-row items-center justify-center">
					{!isComplete && reviewStage === 1 ?
						<>
							<Button
								size="icon-sm"
								variant="default"
								onClick={() => navigateCards('back')}
								disabled={currentCardIndex === 0}
								aria-label="Previous card"
							>
								<ChevronLeft className="size-4" />
							</Button>
							<div className="w-40 text-center text-sm">
								Card {currentCardIndex + 1} of {manifest.length}
							</div>
							<Button
								size="icon-sm"
								variant="default"
								onClick={() => navigateCards('forward')}
								disabled={currentCardIndex === manifest.length}
								aria-label="Next card"
							>
								<ChevronRight className="size-4" />
							</Button>
						</>
					: !isComplete && reviewStage > 1 ?
						<Button
							size="sm"
							variant="ghost"
							aria-label="skip for today"
							onClick={() => navigateCards('next')}
							className="ps-4 pe-2"
						>
							Skip for today <ChevronRight className="size-4" />
						</Button>
					: reviewStage === 1 ?
						<Button
							size="sm"
							variant="ghost"
							aria-label="back one card"
							onClick={() => navigateCards('back')}
							className="ps-2 pe-4"
						>
							<ChevronLeft className="size-4" /> Back one card
						</Button>
					:	null}
				</div>
			</div>
			<div className="flex flex-col items-center justify-center gap-2">
				<div className={isComplete ? 'w-full' : 'hidden'}>
					<WhenComplete
						dailyCacheKey={dailyCacheKey}
						goToFirstSkipped={() => navigateCards('first')}
						goToFirstAgain={() => navigateCards('loop')}
					/>
				</div>

				<div className={!isComplete ? 'w-full' : 'hidden'}>
					{manifest.map((pid, i) => (
						<div
							key={i}
							className={`w-full ${i === currentCardIndex ? 'block' : 'hidden'}`}
						>
							<ReviewSingleCard
								dailyCacheKey={dailyCacheKey}
								pid={pid}
								proceed={() =>
									reviewStage < 4 ?
										navigateCards('next')
									:	navigateCards('loop')
								}
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
