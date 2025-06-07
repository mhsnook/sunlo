import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DailyCacheKey, pids, ReviewStages } from '@/types/main'
import {
	useCardIndex,
	useReviewActions,
	useReviewStage,
} from '@/lib/use-review-store'
import { WhenComplete } from '@/components/review/when-review-complete-screen'
import { ReviewSingleCard } from '@/components/review/review-single-card'
import { QueryClient } from '@tanstack/react-query'

interface ThisComponentProps {
	dailyCacheKey: DailyCacheKey
	manifest: pids
}

export function FlashCardReviewSession({
	dailyCacheKey,
	manifest,
}: ThisComponentProps) {
	const currentCardIndex = useCardIndex()
	const reviewStage = useReviewStage()
	const { gotoNext, gotoPrevious, gotoNextValid } = useReviewActions()

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
								onClick={gotoPrevious}
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
								onClick={gotoNext}
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
							onClick={gotoNextValid}
							className="ps-4 pe-2"
						>
							Skip for today <ChevronRight className="size-4" />
						</Button>
					: reviewStage === 1 ?
						<Button
							size="sm"
							variant="ghost"
							aria-label="back one card"
							onClick={gotoPrevious}
							className="ps-2 pe-4"
						>
							<ChevronLeft className="size-4" /> Back one card
						</Button>
					:	null}
				</div>
			</div>
			<div className="flex flex-col items-center justify-center gap-2">
				<div className={isComplete ? 'w-full' : 'hidden'}>
					<WhenComplete dailyCacheKey={dailyCacheKey} />
				</div>

				<div className={!isComplete ? 'w-full' : 'hidden'}>
					{manifest.map((pid, i) => (
						<div
							key={i}
							className={`w-full ${i === currentCardIndex ? 'block' : 'hidden'}`}
						>
							<ReviewSingleCard dailyCacheKey={dailyCacheKey} pid={pid} />
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
