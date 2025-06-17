import { createFileRoute, Navigate } from '@tanstack/react-router'
import {
	useCardIndex,
	useNextValid,
	useReviewActions,
	useReviewDayString,
	useReviewLang,
	useReviewStage,
} from '@/lib/use-review-store'
import { todayString } from '@/lib/utils'
import { reviewsQuery, useManifest } from '@/lib/use-reviews'
import { Loader } from '@/components/ui/loader'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { WhenComplete } from '@/components/review/when-review-complete-screen'
import { ReviewSingleCard } from '@/components/review/review-single-card'
import { Button } from '@/components/ui/button'
import { pids } from '@/types/main'

export const Route = createFileRoute('/_user/learn/$lang/review/go')({
	component: ReviewPage,
	loader: async ({
		params: { lang },
		context: {
			queryClient,
			auth: { userId },
		},
	}) => {
		const dayString: string = todayString()
		const _todaysReviewData = await queryClient.ensureQueryData(
			reviewsQuery(userId!, lang, dayString)
		)

		return {
			appnav: [],
			dayString,
		}
	},
})

function ReviewPage() {
	const lang = useReviewLang()
	const dayString = useReviewDayString()
	const { data: manifest } = useManifest(lang, dayString)
	const stage = useReviewStage()

	if (typeof manifest !== 'object') return <Loader />
	if (!manifest?.length || stage === 0) return <Navigate to=".." />

	return <FlashCardReviewSession manifest={manifest} />
}

function FlashCardReviewSession({ manifest }: { manifest: pids }) {
	const currentCardIndex = useCardIndex()
	const reviewStage = useReviewStage()
	const { gotoNext, gotoPrevious, gotoIndex } = useReviewActions()
	const nextValidIndex = useNextValid()

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
								disabled={isComplete}
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
				<div className={isComplete ? 'w-full' : 'hidden'}>
					<WhenComplete />
				</div>

				<div className={!isComplete ? 'w-full' : 'hidden'}>
					{manifest.map((pid, i) => (
						<div
							key={i}
							className={`w-full ${i === currentCardIndex ? 'block' : 'hidden'}`}
						>
							<ReviewSingleCard pid={pid} />
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
