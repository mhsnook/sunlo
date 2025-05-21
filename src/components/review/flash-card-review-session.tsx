import { useCallback, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { pids } from '@/types/main'

import {
	getFromLocalStorage,
	getIndexOfNextUnfinishedCard,
} from '@/lib/use-reviewables'

import { useLoaderData } from '@tanstack/react-router'
import { WhenComplete } from '@/components/review/when-review-complete-screen'
import { ReviewSingleCard } from '@/components/review/review-single-card'

interface ComponentProps {
	dailyCacheKey: Array<string>
}

export function FlashCardReviewSession({ dailyCacheKey }: ComponentProps) {
	const pids = getFromLocalStorage<pids>(dailyCacheKey)
	if (!pids?.length) {
		throw new Error(`Error fetching phrase manifest from localStorage`)
	}

	const [currentCardIndex, setCurrentCardIndex] = useState(() =>
		getIndexOfNextUnfinishedCard(dailyCacheKey, -1)
	)

	const { cardsMap, phrasesMap } = useLoaderData({
		from: '/_user/learn/$lang',
		select: (data) => ({
			cardsMap: data.deck.cardsMap,
			phrasesMap: data.language.phrasesMap,
		}),
	})

	const navigateCards = useCallback(
		(direction: 'forward' | 'back' | 'next' | 'unfinished') => {
			if (direction === 'forward') setCurrentCardIndex((i) => i + 1)
			if (direction === 'back') setCurrentCardIndex((i) => i - 1)
			if (direction === 'next')
				setCurrentCardIndex((i) =>
					getIndexOfNextUnfinishedCard(dailyCacheKey, i)
				)
			if (direction === 'unfinished')
				setCurrentCardIndex(() =>
					getIndexOfNextUnfinishedCard(dailyCacheKey, -1)
				)
		},
		[currentCardIndex, setCurrentCardIndex, dailyCacheKey]
	)

	const isComplete = currentCardIndex === pids.length

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
						pids={pids}
						dailyCacheKey={dailyCacheKey}
						go={() => navigateCards('unfinished')}
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
					<div className="text-center text-sm">
						Card {currentCardIndex + 1} of {pids.length}
					</div>
					<Button
						size="icon-sm"
						variant="default"
						onClick={() => navigateCards('forward')}
						disabled={currentCardIndex === pids.length}
						aria-label="Next card"
					>
						<ChevronRight className="size-4" />
					</Button>
				</div>

				{pids.map((pid, i) => (
					<ReviewSingleCard
						key={i}
						isCurrentlyShown={i === currentCardIndex}
						dailyCacheKey={dailyCacheKey}
						phrase={phrasesMap[pid]}
						card={cardsMap[pid]}
						proceed={() => {
							navigateCards('next')
						}}
					/>
				))}
			</div>
		</div>
	)
}
