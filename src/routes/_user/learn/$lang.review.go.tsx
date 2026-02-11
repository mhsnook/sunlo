import { useCallback, useRef, useState } from 'react'
import { pids } from '@/types/main'

import { createFileRoute, Navigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
	useCardIndex,
	useNextValid,
	usePreviewSeen,
	useReviewActions,
	useReviewDayString,
	useReviewLang,
	useReviewStage,
} from '@/hooks/use-review-store'
import { useReviewDay } from '@/hooks/use-reviews'
import { Loader } from '@/components/ui/loader'
import { WhenComplete } from '@/components/review/when-review-complete-screen'
import { ReviewSingleCard } from '@/components/review/review-single-card'
import { NewCardsPreview } from '@/components/review/new-cards-preview'
import { Button } from '@/components/ui/button'
import { cardReviewsCollection, reviewDaysCollection } from '@/lib/collections'

export const Route = createFileRoute('/_user/learn/$lang/review/go')({
	beforeLoad: () => ({
		contextMenu: [],
		focusMode: true,
	}),
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
	const previewSeen = usePreviewSeen()

	if (isLoading) return <Loader />
	if (!day?.manifest?.length || !stage)
		return <Navigate to="/learn/$lang/review" from={Route.fullPath} /> // works for some reason

	// Show preview of new cards before starting review (only in stage 1)
	if (stage === 1 && !previewSeen) {
		return <NewCardsPreview manifest={day.manifest} />
	}

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

	// Animation: phase tracks 'idle' | 'out' | 'in', outClass picks the direction
	const [anim, setAnim] = useState<{ phase: string; outClass: string }>({
		phase: 'idle',
		outClass: '',
	})
	const pendingNavRef = useRef<(() => void) | null>(null)
	const isAnimating = anim.phase !== 'idle'

	const animateTransition = useCallback(
		(navigate: () => void, direction: 'left' | 'right' = 'left') => {
			if (isAnimating) return
			pendingNavRef.current = navigate
			setAnim({
				phase: 'out',
				outClass:
					direction === 'left' ?
						'animate-card-out-left'
					:	'animate-card-out-right',
			})
		},
		[isAnimating]
	)

	// The mutation calls triggerSlide — always exits left (scored = moving forward)
	const triggerSlide = useCallback(
		(navigate: () => void) => animateTransition(navigate, 'left'),
		[animateTransition]
	)

	const handleAnimationEnd = useCallback(() => {
		if (anim.phase === 'out') {
			pendingNavRef.current?.()
			pendingNavRef.current = null
			setAnim({ phase: 'in', outClass: '' })
		} else {
			setAnim({ phase: 'idle', outClass: '' })
		}
	}, [anim.phase])

	const animClass =
		anim.phase === 'out' ? anim.outClass
		: anim.phase === 'in' ? 'animate-card-pop-in'
		: ''

	return (
		<div
			className="flex h-full flex-col gap-2 py-2"
			data-testid="review-session-page"
		>
			<div className="flex flex-col items-center justify-center gap-2">
				<div className="flex min-h-10 flex-row items-center justify-center">
					{!atTheEnd && reviewStage === 1 ?
						<>
							<Button
								size="icon"
								variant="default"
								onClick={() => animateTransition(gotoPrevious, 'right')}
								disabled={currentCardIndex === 0 || isAnimating}
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
								onClick={() => animateTransition(gotoNext, 'left')}
								disabled={atTheEnd || isAnimating}
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
							onClick={() =>
								animateTransition(() => gotoIndex(nextValidIndex), 'left')
							}
							disabled={isAnimating}
							className="ps-4 pe-2"
						>
							Skip for today <ChevronRight className="size-4" />
						</Button>
					: reviewStage === 1 ?
						<Button
							size="sm"
							variant="ghost"
							aria-label="back one card"
							onClick={() => animateTransition(gotoPrevious, 'right')}
							disabled={isAnimating}
							className="ps-2 pe-4"
						>
							<ChevronLeft className="size-4" /> Back one card
						</Button>
					:	null}
				</div>
			</div>
			<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-4 -m-4">
				<div className={atTheEnd ? 'w-full' : 'hidden'}>
					<WhenComplete />
				</div>

				<div className={!atTheEnd ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
					{manifest.map((pid, i) => (
						<div
							key={pid}
							className={i === currentCardIndex ? `flex min-h-0 flex-1 flex-col ${animClass}` : 'hidden'}
							onAnimationEnd={
								i === currentCardIndex ? handleAnimationEnd : undefined
							}
						>
							<ReviewSingleCard
								pid={pid}
								reviewStage={reviewStage}
								dayString={dayString}
								triggerSlide={triggerSlide}
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
