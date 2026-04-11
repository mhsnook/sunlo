import { useCallback, useState } from 'react'

import { createFileRoute, Navigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
	useCardIndex,
	useReviewActions,
	useReviewDayString,
	useReviewLang,
	useReviewStage,
} from '@/features/review/store'
import { useNextValid, useReviewDay } from '@/features/review/hooks'
import { Loader } from '@/components/ui/loader'
import { WhenComplete } from '@/components/review/when-review-complete-screen'
import { ReviewSingleCard } from '@/components/review/review-single-card'
import { Button } from '@/components/ui/button'
import {
	cardReviewsCollection,
	reviewDaysCollection,
} from '@/features/review/collections'
import {
	parseManifestEntry,
	type ManifestEntry,
} from '@/features/review/manifest'
import { useCheck, should } from '@scenetest/checks-react'

export const Route = createFileRoute('/_user/learn/$lang/review/go')({
	beforeLoad: () => ({
		contextMenu: [],
		focusMode: true,
		fixedHeight: true,
	}),
	component: ReviewPage,
	loader: async ({ context }) => {
		if (!context.auth.isAuth) return
		await Promise.all([
			reviewDaysCollection.preload(),
			cardReviewsCollection.preload(),
		])
	},
})

function ReviewPage() {
	const lang = useReviewLang()
	const dayString = useReviewDayString()
	const { data: day, isLoading } = useReviewDay(lang, dayString)
	const stage = useReviewStage()

	if (isLoading) return <Loader />
	if (!day?.manifest?.length || stage === null)
		return <Navigate to="/learn/$lang/review" from={Route.fullPath} />

	return (
		<FlashCardReviewSession manifest={day.manifest} dayString={dayString} />
	)
}

function FlashCardReviewSession({
	manifest,
	dayString,
}: {
	manifest: Array<ManifestEntry>
	dayString: string
}) {
	const currentCardIndex = useCardIndex()
	const reviewStage = useReviewStage()
	const { gotoNext, gotoPrevious, gotoIndex } = useReviewActions()
	const nextValidIndex = useNextValid()

	const atTheEnd = currentCardIndex === manifest.length

	useCheck(() => {
		should('manifest should not be empty', manifest.length > 0)

		// Verify ordering: all forward entries come before all reverse entries
		const lastForwardIdx = manifest.findLastIndex((e) => e.endsWith(':forward'))
		const firstReverseIdx = manifest.findIndex((e) => e.endsWith(':reverse'))
		should(
			'forward cards should come before reverse cards in manifest',
			firstReverseIdx === -1 || lastForwardIdx < firstReverseIdx,
			{ lastForwardIdx, firstReverseIdx, manifestLength: manifest.length }
		)
	}, [manifest])

	// Navigation happens immediately on click — never blocked by animation.
	const [animKey, setAnimKey] = useState(0)

	const animateAndNavigate = useCallback((navigate: () => void) => {
		navigate()
		setAnimKey((k) => k + 1)
	}, [])

	const triggerSlide = animateAndNavigate

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
								onClick={() => animateAndNavigate(gotoPrevious)}
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
								onClick={() => animateAndNavigate(gotoNext)}
								disabled={atTheEnd}
								aria-label="Next card"
							>
								<ChevronRight className="size-4" />
							</Button>
						</>
					: !atTheEnd && (reviewStage ?? 0) > 1 ?
						<Button
							size="sm"
							variant="ghost"
							aria-label="skip for today"
							onClick={() =>
								animateAndNavigate(() => gotoIndex(nextValidIndex))
							}
							className="ps-4 pe-2"
						>
							Skip for today <ChevronRight className="size-4" />
						</Button>
					: reviewStage === 1 ?
						<Button
							size="sm"
							variant="ghost"
							aria-label="back one card"
							onClick={() => animateAndNavigate(gotoPrevious)}
							className="ps-2 pe-4"
						>
							<ChevronLeft className="size-4" /> Back one card
						</Button>
					:	null}
				</div>
			</div>
			<div className="-mx-4 -mb-4 min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-4">
				{atTheEnd ?
					<WhenComplete />
				:	(() => {
						const { phraseId, direction } = parseManifestEntry(
							manifest[currentCardIndex]
						)
						return (
							<div
								key={`${manifest[currentCardIndex]}-${animKey}`}
								className="animate-card-pop-in flex min-h-full flex-col gap-2"
							>
								<ReviewSingleCard
									pid={phraseId}
									direction={direction}
									reviewStage={reviewStage ?? 1}
									dayString={dayString}
									triggerSlide={triggerSlide}
								/>
							</div>
						)
					})()
				}
			</div>
		</div>
	)
}
