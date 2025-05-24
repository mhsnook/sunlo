import { useCallback, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DailyCacheKey } from '@/types/main'

import {
	getIndexOfNextUnreviewedCard,
	getIndexOfNextAgainCard,
	getManifestFromLocalStorage,
	getAgainsFromLocalStorage,
} from '@/lib/use-reviewables'

import { WhenComplete } from '@/components/review/when-review-complete-screen'
import { ReviewSingleCard } from '@/components/review/review-single-card'
import { useDeckCardsMap } from '@/lib/use-deck'
import { useLanguagePhrasesMap } from '@/lib/use-language'
import { Loader } from '@/components/ui/loader'

interface ComponentProps {
	dailyCacheKey: DailyCacheKey
	loop?: boolean
	lang: string
}

export function FlashCardReviewSession({
	dailyCacheKey,
	loop = false,
	lang,
}: ComponentProps) {
	const pids =
		loop ?
			getAgainsFromLocalStorage(dailyCacheKey)
		:	getManifestFromLocalStorage(dailyCacheKey)

	// do we have to change this bc the agains one can be length 0?
	if (!pids?.length) {
		throw new Error(
			`Error fetching phrase manifest from localStorage, loop: ${loop}`
		)
	}

	const [currentCardIndex, setCurrentCardIndex] = useState(() =>
		getIndexOfNextUnreviewedCard(dailyCacheKey, -1)
	)

	const { data: cardsMap } = useDeckCardsMap(lang)
	const { data: phrasesMap } = useLanguagePhrasesMap(lang)

	const navigateCards = useCallback(
		(direction: 'forward' | 'back' | 'next' | 'first' | 'loop') => {
			if (direction === 'forward') setCurrentCardIndex((i) => i + 1)
			if (direction === 'back') setCurrentCardIndex((i) => i - 1)
			if (direction === 'next')
				setCurrentCardIndex((i) =>
					getIndexOfNextUnreviewedCard(dailyCacheKey, i)
				)
			if (direction === 'first')
				setCurrentCardIndex(() =>
					getIndexOfNextUnreviewedCard(dailyCacheKey, -1)
				)
			if (direction === 'loop')
				setCurrentCardIndex((i) => {
					const foundCardIndex = getIndexOfNextAgainCard(dailyCacheKey, i)
					const finalFoundIndex =
						!(foundCardIndex === pids.length) ?
							foundCardIndex
						:	getIndexOfNextAgainCard(dailyCacheKey, -1)
					return finalFoundIndex
				})
		},
		[currentCardIndex, setCurrentCardIndex, dailyCacheKey]
	)

	const isComplete = currentCardIndex === pids.length
	if (!phrasesMap || !cardsMap) return <Loader />
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
						goToSkipped={() => navigateCards('first')}
						goToLoop={() => navigateCards('loop')}
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
				<div className="w-full">
					{pids.map((pid, i) =>
						!cardsMap[pid] || !phrasesMap[pid] ?
							null
						:	<div
								key={i}
								className={`w-full ${i === currentCardIndex ? 'block' : 'hidden'}`}
							>
								<ReviewSingleCard
									dailyCacheKey={dailyCacheKey}
									phrase={phrasesMap[pid]}
									card={cardsMap[pid]}
									loop={loop}
									proceed={
										loop ?
											() => navigateCards('loop')
										:	() => navigateCards('next')
									}
								/>
							</div>
					)}
				</div>
			</div>
		</div>
	)
}
