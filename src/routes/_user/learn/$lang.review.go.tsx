import { pids } from '@/types/main'

import { createFileRoute, Navigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
	useCardIndex,
	useNextValid,
	useReviewActions,
	useReviewDayString,
	useReviewLang,
	useReviewStage,
} from '@/hooks/use-review-store'
import { useReviewDay } from '@/hooks/use-reviews'
import { Loader } from '@/components/ui/loader'
import { WhenComplete } from '@/components/review/when-review-complete-screen'
import { ReviewSingleCard } from '@/components/review/review-single-card'
import { Button } from '@/components/ui/button'
import { cardReviewsCollection, reviewDaysCollection } from '@/lib/collections'

export const Route = createFileRoute('/_user/learn/$lang/review/go')({
	component: ReviewPage,
	loader: async () => {
		const daysLoaded = reviewDaysCollection.preload()
		const reviewsLoaded = cardReviewsCollection.preload()
		await Promise.all([daysLoaded, reviewsLoaded])
	},
})

function ReviewPage() {
	const lang = useReviewLang()
	const dayString = useReviewDayString()
	const { data: day, isLoading } = useReviewDay(lang, dayString)
	const stage = useReviewStage()

	if (isLoading) return <Loader />
	if (!day?.manifest?.length || !stage)
		return <Navigate to="/learn/$lang/review" from={Route.fullPath} /> // works for some reason

	return (
		<FlashCardReviewSession manifest={day.manifest} dayString={dayString} />
	)
}

function FlashCardReviewSession({
	manifest,
	dayString,
}: {
	manifest: pids
	dayString: string
}) {
	const currentCardIndex = useCardIndex()
	const reviewStage = useReviewStage()
	const { gotoNext, gotoPrevious, gotoIndex } = useReviewActions()
	const nextValidIndex = useNextValid()

	const atTheEnd = currentCardIndex === manifest.length

	return (
		<div className="flex-col items-center justify-center gap-2 py-2">
			<div className="mb-2 flex flex-col items-center justify-center gap-2">
				<div className="flex min-h-10 flex-row items-center justify-center">
					{!atTheEnd && reviewStage === 1 ?
						<>
							<Button
								size="icon"
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
								size="icon"
								variant="default"
								onClick={gotoNext}
								disabled={atTheEnd}
								aria-label="Next card"
							>
								<ChevronRight className="size-4" />
							</Button>
						</>
					: !atTheEnd && reviewStage > 1 ?
						<Button
							size="sm"
							variant="ghost"
							aria-label="skip for today"
							// oxlint-disable-next-line jsx-no-new-function-as-prop
							onClick={() => gotoIndex(nextValidIndex)}
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
				<div className={atTheEnd ? 'w-full' : 'hidden'}>
					<WhenComplete />
				</div>

				<div className={!atTheEnd ? 'w-full' : 'hidden'}>
					{manifest.map((pid, i) => (
						<div
							key={pid}
							className={`w-full ${i === currentCardIndex ? 'block' : 'hidden'}`}
						>
							<ReviewSingleCard
								pid={pid}
								reviewStage={reviewStage}
								dayString={dayString}
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
