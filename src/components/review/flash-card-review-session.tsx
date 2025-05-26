import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DailyCacheKey, pids, ReviewStages } from '@/types/main'

import {
	getIndexOfLoopedAgainCard,
	getIndexOfNextUnreviewedCard,
	useReviewState,
} from '@/lib/use-reviewables'

import { WhenComplete } from '@/components/review/when-review-complete-screen'
import { ReviewSingleCard } from '@/components/review/review-single-card'
import { useQueryClient } from '@tanstack/react-query'

interface ThisComponentProps {
	dailyCacheKey: DailyCacheKey
	pidsManifest: pids
	reviewStage: ReviewStages
}

export function FlashCardReviewSession({
	dailyCacheKey,
	pidsManifest,
	reviewStage,
}: ThisComponentProps) {
	const [currentCardIndex, setCurrentCardIndex] = useState(() =>
		reviewStage < 4 ?
			getIndexOfNextUnreviewedCard(dailyCacheKey, -1)
		:	getIndexOfLoopedAgainCard(dailyCacheKey, -1)
	)
	const { data: state } = useReviewState(dailyCacheKey)
	const queryClient = useQueryClient()
	const navigateCards = useCallback(
		(direction: 'forward' | 'back' | 'next' | 'first' | 'loop') => {
			if (direction === 'first')
				setCurrentCardIndex(() =>
					getIndexOfNextUnreviewedCard(dailyCacheKey, -1)
				)
			if (direction === 'forward') setCurrentCardIndex((i) => i + 1)
			if (direction === 'back') setCurrentCardIndex((i) => i - 1)
			if (direction === 'next')
				setCurrentCardIndex((i) =>
					getIndexOfNextUnreviewedCard(dailyCacheKey, i)
				)
			// the loop only applies to again-cards, and we don't want to have to
			// wait a render cycle for the function ref to update to then call it
			if (direction === 'loop')
				setCurrentCardIndex((i) => getIndexOfLoopedAgainCard(dailyCacheKey, i))
		},
		[dailyCacheKey]
	)

	const isComplete = currentCardIndex === pidsManifest.length
	useEffect(() => {
		if (isComplete)
			queryClient.invalidateQueries({
				queryKey: [...dailyCacheKey, 'review-state'],
			})
	}, [isComplete])

	return (
		<div className="flex-col items-center justify-center gap-2 py-2">
			<div
				className={`${isComplete ? 'flex' : 'hidden'} flex-col items-center justify-center gap-2`}
			>
				<div className={`flex min-h-10 flex-row items-center justify-center`}>
					<Button
						size="sm"
						variant="ghost"
						aria-label="back one card"
						onClick={() => navigateCards('back')}
						className="ps-2 pe-4"
					>
						<ChevronLeft className="me-1 size-4" /> Back one card
					</Button>
				</div>
				{!isComplete ? null : (
					<WhenComplete
						dailyCacheKey={dailyCacheKey}
						goToFirstSkipped={() => navigateCards('first')}
						goToFirstAgain={() => navigateCards('loop')}
					/>
				)}
			</div>
			<div
				className={`${isComplete ? 'hidden' : 'flex'} flex-col items-center justify-center gap-2`}
			>
				<div
					className={`flex min-h-10 flex-row items-center justify-center gap-4`}
				>
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
						Card {currentCardIndex + 1} of {pidsManifest.length}
					</div>
					<Button
						size="icon-sm"
						variant="default"
						onClick={() => navigateCards('forward')}
						disabled={currentCardIndex === pidsManifest.length}
						aria-label="Next card"
					>
						<ChevronRight className="size-4" />
					</Button>
				</div>
				<div className="w-full">
					{pidsManifest.map((pid, i) => (
						<div
							key={i}
							className={`w-full ${i === currentCardIndex ? 'block' : 'hidden'}`}
						>
							<ReviewSingleCard
								dailyCacheKey={dailyCacheKey}
								pid={pid}
								proceed={
									state.reviewStage < 4 ?
										() => navigateCards('next')
									:	() => navigateCards('loop')
								}
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
