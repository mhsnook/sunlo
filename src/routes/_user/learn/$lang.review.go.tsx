import { useCallback, useLayoutEffect, useRef, useState } from 'react'

import { createFileRoute, Navigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
	useCardIndex,
	useReviewActions,
	useReviewDayString,
	useReviewLang,
} from '@/features/review/store'
import {
	ensureManifestCardsInCollection,
	useNextValid,
	useReviewDay,
	useReviewsTodayStats,
	useUpdateReviewStage,
} from '@/features/review/hooks'
import { Loader } from '@/components/ui/loader'
import { WhenComplete } from '@/components/review/when-review-complete-screen'
import { ReviewSingleCard } from '@/components/review/review-single-card'
import { Button } from '@/components/ui/button'
import {
	cardReviewsCollection,
	reviewSessionsCollection,
	reviewMilestonesCollection,
} from '@/features/review/collections'
import {
	parseManifestEntry,
	type ManifestEntry,
} from '@/features/review/manifest'
import { useCheck, should } from '@scenetest/checks/react'
import { todayString } from '@/lib/utils'

export const Route = createFileRoute('/_user/learn/$lang/review/go')({
	staticData: {
		contextMenu: [],
		focusMode: true,
		fixedHeight: true,
	},
	component: ReviewPage,
	loader: async ({ context, params }) => {
		if (!context.auth.isAuth) return
		await Promise.all([
			reviewSessionsCollection.preload(),
			cardReviewsCollection.preload(),
			reviewMilestonesCollection.preload(),
		])
		await ensureManifestCardsInCollection(params.lang, todayString())
	},
})

function ReviewPage() {
	const lang = useReviewLang()
	const dayString = useReviewDayString()
	const currentCardIndex = useCardIndex()
	const { data: day, isLoading } = useReviewDay(lang, dayString)

	if (isLoading) return <Loader />
	// currentCardIndex === -1 means the cursor store hasn't been initialised —
	// i.e. we landed here without going through setup/continue. Redirect back so
	// the index route can seed the cursor (from stats.index) before we render.
	if (!day?.manifest?.length || currentCardIndex === -1)
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
	const lang = useReviewLang()
	const stats = useReviewsTodayStats(lang, dayString).data
	const reviewStage = stats.stage
	const { gotoNext, gotoPrevious, gotoIndex } = useReviewActions()
	const nextValidIndex = useNextValid()
	const updateStage = useUpdateReviewStage(lang, dayString)

	// "Skip for today" means different things per phase. In the go-back phase
	// (stage 2) it skips one unreviewed card and walks forward to the end. In the
	// again round (stage >= 3) there's no forward end to walk to — unmastered
	// Again cards keep the complete-screen re-offering the round, and the phase
	// only closes by advancing to stage 5. So skipping the again round finishes
	// it outright rather than cycling back onto the remaining Again cards.
	const handleSkipForToday = useCallback(() => {
		if ((reviewStage ?? 0) >= 3) {
			updateStage(5)
			gotoIndex(manifest.length)
		} else {
			gotoIndex(nextValidIndex)
		}
	}, [reviewStage, updateStage, gotoIndex, manifest.length, nextValidIndex])

	// Position derives from the shared (stage, reviews). The stored cursor is a
	// within-stage browse offset only; on mount and whenever the stage advances —
	// including a stage change pushed in from another device — snap back to the
	// stage's canonical resume index (stats.index). Without this, a cursor left
	// mid-manifest under a now-stale stage gets read against the wrong phase (e.g.
	// a stage-5 session rendering a leftover card, where one "skip" jumps to the
	// again-round's empty set and lands on "finished"). The ref keeps the effect
	// keyed on stage alone — re-seeding on every stats.index change would fight
	// in-stage navigation and answer-advance.
	const seedRef = useRef(stats.index)
	seedRef.current = stats.index
	useLayoutEffect(() => {
		gotoIndex(seedRef.current)
	}, [reviewStage, gotoIndex])

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
					{!atTheEnd && reviewStage === 1 ? (
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
					) : !atTheEnd && (reviewStage ?? 0) > 1 ? (
						<Button
							size="sm"
							variant="ghost"
							aria-label="skip for today"
							onClick={() => animateAndNavigate(handleSkipForToday)}
							className="ps-4 pe-2"
						>
							Skip for today <ChevronRight className="size-4" />
						</Button>
					) : reviewStage === 1 ? (
						<Button
							size="sm"
							variant="ghost"
							aria-label="back one card"
							onClick={() => animateAndNavigate(gotoPrevious)}
							className="ps-2 pe-4"
						>
							<ChevronLeft className="size-4" /> Back one card
						</Button>
					) : null}
				</div>
			</div>
			<div className="-mx-4 -mb-4 min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-4">
				{atTheEnd ? (
					<WhenComplete />
				) : (
					(() => {
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
				)}
			</div>
		</div>
	)
}
