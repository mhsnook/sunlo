import type { pids } from '@/types/main'

import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toastSuccess } from '@/components/ui/sonner'
import {
	BookOpen,
	CalendarClock,
	MessageSquare,
	MessageSquarePlus,
	Rocket,
	Sparkles,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RequireAuth, useIsAuthenticated } from '@/components/require-auth'
import languages from '@/lib/languages'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerTrigger } from '@/components/ui/drawer'
import Flagged from '@/components/flagged'
import {
	useInitialiseReviewStore,
	useReviewDayString,
	useReviewStage,
} from '@/hooks/use-review-store'
import { arrayDifference, arrayUnion, min0 } from '@/lib/utils'
import { useDeckMeta, useDeckPids } from '@/hooks/use-deck'
import supabase from '@/lib/supabase-client'
import {
	LanguageIsEmpty,
	LanguageFilteredIsEmpty,
} from '@/components/language-is-empty'
import { NotEnoughCards } from '@/components/review/not-enough-cards'
import { SelectPhrasesToAddToReview } from '@/components/review/select-phrases-to-add-to-review'
import { useUserId } from '@/lib/use-auth'
import { useReviewsTodayStats } from '@/hooks/use-reviews'
import { ContinueReview } from '@/components/review/continue-review'
import { WhenComplete } from '@/components/review/when-review-complete-screen'
import { useCompositePids } from '@/hooks/composite-pids'
import {
	CardMetaSchema,
	CardStatusEnumType,
	DailyReviewStateSchema,
} from '@/lib/schemas'
import { cardsCollection, reviewDaysCollection } from '@/lib/collections'
import { useIntro } from '@/hooks/use-intro-seen'
import { ReviewIntro, ReviewCallout } from '@/components/intros'

export const Route = createFileRoute('/_user/learn/$lang/review/')({
	component: ReviewPageSetup,
})

// Outer component handles auth check
function ReviewPageSetup() {
	const isAuth = useIsAuthenticated()

	// Require auth for review
	if (!isAuth) {
		return (
			<RequireAuth message="You need to be logged in to review your flashcards.">
				<div />
			</RequireAuth>
		)
	}

	return <ReviewPageContent />
}

// Inner component contains all the hooks - only rendered when authenticated
function ReviewPageContent() {
	const { lang } = Route.useParams()
	const dayString = useReviewDayString()
	const stage = useReviewStage()
	const userId = useUserId()
	// const retrievabilityTarget = 0.9
	const { data: meta } = useDeckMeta(lang)
	const recs = useCompositePids(lang)
	const { data: deckPids } = useDeckPids(lang)
	const initLocalReviewState = useInitialiseReviewStore()
	const { data: stats } = useReviewsTodayStats(lang, dayString)

	const { isOpen, showCallout, handleClose, handleReopen } = useIntro('review')

	const [algoRecsSelected, setAlgoRecsSelected] = useState<pids>([])

	// 2.
	// haven't built this feature yet, is why it's blank array
	// const friendRecsFromDB: pids = [] // useCardsRecommendedByFriends(lang)
	const friendRecsFiltered = arrayDifference(
		[] /* friendRecsFromDB */,
		[deckPids?.reviewed_or_inactive ?? []]
	)

	const friendRecsSelected = friendRecsFiltered.slice(
		0,
		meta?.daily_review_goal ?? 0
	)

	const countNeeded2 = min0(
		(meta?.daily_review_goal ?? 0) - friendRecsSelected.length
	)

	// 3. algo recs set by user
	const algoRecsFiltered = {
		popular: arrayDifference(recs?.top8.popular ?? [], [
			deckPids?.reviewed_or_inactive ?? [],
			friendRecsFiltered,
		]),
		easiest: arrayDifference(recs?.top8.easiest ?? [], [
			deckPids?.reviewed_or_inactive ?? [],
			friendRecsFiltered,
		]),
		newest: arrayDifference(recs?.top8.newest ?? [], [
			deckPids?.reviewed_or_inactive ?? [],
			friendRecsFiltered,
		]),
	}

	const countNeeded3 = min0(countNeeded2 - algoRecsSelected.length)
	const algosInitialCount =
		algoRecsFiltered.popular.length +
		algoRecsFiltered.easiest.length +
		algoRecsFiltered.newest.length
	const algosEmpty = algosInitialCount === 0

	// 4. deck cards
	// pull new unreviewed cards, excluding the friend recs we already got,
	// and limiting to the number we need from the deck
	const cardsUnreviewedActiveSelected = arrayDifference(
		deckPids?.unreviewed_active ?? [],
		[friendRecsSelected, algoRecsSelected]
	).slice(0, countNeeded3)

	// the user does not get to preview or select these.
	// in many cases, we'll be done here because people will have 15+ cards
	// available in their deck. but if not...

	const countNeeded4 = min0(countNeeded3 - cardsUnreviewedActiveSelected.length)

	// 5. pick cards randomly from the library, if needed

	// sorting by pid is randomish, but stable
	const libraryPhrasesSelected = arrayDifference(
		recs?.language_selectables ?? [],
		[friendRecsSelected, algoRecsSelected, cardsUnreviewedActiveSelected]
	)
		.toSorted((a, b) => (a > b ? -1 : 1))
		.slice(0, countNeeded4)

	// 6. now let's just collate the cards we need to create on user_card table
	const freshCards = arrayUnion([
		friendRecsSelected, // 2
		algoRecsSelected, // 3
		cardsUnreviewedActiveSelected, // 4
		libraryPhrasesSelected, // 5
	])

	const cardsToCreate = arrayDifference(freshCards, [deckPids?.all ?? []])

	const allCardsForToday = arrayUnion([
		freshCards,
		deckPids?.today_active ?? [],
	])

	// const countSurplusOrDeficit = freshCards.length - countNeeded
	const { mutate, isPending } = useMutation({
		mutationKey: ['user', lang, 'review', dayString, 'create'],
		mutationFn: async () => {
			console.log(
				`Starting mutation to create ${allCardsForToday.length} cards`,
				{ cardsToCreate }
			)
			const { data: newCards } =
				cardsToCreate.length === 0 ?
					{ data: [] }
				:	await supabase
						.from('user_card')
						.upsert(
							cardsToCreate.map((pid) => ({
								phrase_id: pid,
								lang,
								uid: userId!,
								status: 'active' as CardStatusEnumType,
							}))
						)
						.select()
						.throwOnError()

			const { data: reviewDay } =
				newCards.length !== cardsToCreate.length ?
					{ data: null }
				:	await supabase
						.from('user_deck_review_state')
						.insert({
							lang,
							day_session: dayString,
							uid: userId!,
							manifest: allCardsForToday,
						})
						.throwOnError()
						.select()
						.single()

			if (
				!Array.isArray(reviewDay?.manifest) ||
				reviewDay.manifest.length !== allCardsForToday.length
			)
				console.warn(
					`Error creating daily session: expected manifest of length ${allCardsForToday.length} but got back a manifest ${Array.isArray(reviewDay?.manifest) ? 'with ' + reviewDay.manifest.length + 'entries' : 'of type "' + typeof reviewDay?.manifest}".`
				)

			return {
				countCards: allCardsForToday.length,
				countCardsFresh: freshCards.length,
				countCardsCreated: newCards.length,
				freshCardPids: freshCards,
				newCards,
				reviewDay,
			}
		},
		onSettled: (data, error) => {
			if (error) throw error
			if (!data) throw new Error('No data returned from mutation')
			if (!data.reviewDay)
				throw new Error('No daily session data returned from mutation')

			// add new records to local db collections
			data.newCards.forEach((c) => {
				cardsCollection.utils.writeInsert(CardMetaSchema.parse(c))
			})
			if (data.reviewDay)
				reviewDaysCollection.utils.writeInsert(
					DailyReviewStateSchema.parse(data.reviewDay)
				)
			if (data.newCards.length !== cardsToCreate.length)
				throw new Error(
					`Error creating new cards for today's review. Expected ${cardsToCreate.length} but got back ${data.newCards.length}.`
				)
			if (!Array.isArray(data.reviewDay.manifest))
				throw new Error(
					`Error creating today's review session: server returned type "${typeof data.reviewDay.manifest}"`
				)
			if (
				data.reviewDay.manifest.length === 0 ||
				data.reviewDay.manifest.length !== allCardsForToday.length
			)
				throw new Error(
					`Error creating today's review session: expected ${allCardsForToday.length} cards today, but got back a manifest of length ${data.reviewDay.manifest.length}`
				)
			// Pass the fresh (new) card pids for the preview feature
			initLocalReviewState({
				lang,
				dayString,
				countCards: data.countCards,
				newCardPids: data.freshCardPids,
			})
			toastSuccess(
				`Ready to go! ${data.countCardsCreated} to study today, ${data.countCardsFresh} fresh new cards ready to go.`
			)
		},
	})

	// Data validation - these checks happen after all hooks
	if (meta?.lang !== lang)
		throw new Error("Attempted to build a review but we can't find the deck")
	if (!deckPids || !recs)
		throw new Error('Pids/recs should not be null here :/, even once')

	// when the manifest is present, skip this page, go to a better one
	if (stats?.count)
		return (
			stats?.complete === stats?.count ? <WhenComplete />
			: stage !== null ?
				<Navigate to="/learn/$lang/review/go" from={Route.fullPath} />
			:	<ContinueReview lang={lang} dayString={dayString} reviewStats={stats} />
		)

	return (
		<>
			{/* Review intro dialog for first-time reviewers */}
			<ReviewIntro open={isOpen} onClose={handleClose} />

			{/* Small callout for returning users */}
			{showCallout && (
				<div className="mb-4">
					<ReviewCallout onShowMore={handleReopen} />
				</div>
			)}

			<Card data-testid="review-setup-page">
				<CardHeader>
					<CardTitle className="flex flex-row justify-between">
						<div>Get Ready to review your {languages[lang]} cards</div>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-muted-foreground max-w-2xl text-lg">
						Your personalized review session is prepared and waiting for you.
						Here's what to expect...
					</p>
					{recs.language.length === 0 ?
						<LanguageIsEmpty lang={lang} />
					: recs.language_filtered.length === 0 ?
						<LanguageFilteredIsEmpty lang={lang} />
					:	<>
							<div className="flex flex-row flex-wrap gap-4 text-sm">
								<Card className="grow basis-40">
									<CardHeader className="pb-2">
										<CardTitle className="flex items-center gap-2 text-xl">
											Total Cards
										</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="flex flex-row items-center justify-start gap-2 text-4xl font-bold text-orange-500">
											<BookOpen />
											{allCardsForToday.length}
										</p>
										<p className="text-muted-foreground">
											cards to work on today
										</p>
									</CardContent>
								</Card>
								<Card className="grow basis-40">
									<CardHeader className="pb-2">
										<CardTitle className="text-xl">Scheduled</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="flex flex-row items-center justify-start gap-2 text-4xl font-bold text-purple-500">
											<CalendarClock />
											<span>{deckPids.today_active.length}</span>
										</p>
										<p className="text-muted-foreground">
											scheduled based on past reviews
										</p>
									</CardContent>
								</Card>
								<Card className="grow basis-40">
									<CardHeader className="pb-2">
										<CardTitle className="text-xl">New Phrases</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="flex flex-row items-center justify-start gap-2 text-4xl font-bold text-green-500">
											<MessageSquarePlus />
											<span>{freshCards.length}</span>
										</p>
										<p className="text-muted-foreground">
											cards you haven't reviewed before
										</p>
									</CardContent>
								</Card>

								<Card className="grow basis-40">
									<CardHeader className="pb-2">
										<CardTitle className="flex items-center gap-2 text-xl">
											<MessageSquare className="text-primary" />
											Sources
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-2">
										<Flagged
											name="friend_recommendations"
											className="flex items-center justify-between"
										>
											<span className="text-muted-foreground">
												Friend recs:
											</span>
											<Badge variant="outline">
												{friendRecsSelected.length}
											</Badge>
										</Flagged>
										<div className="flex items-center justify-between">
											<span className="text-muted-foreground">
												Sunlo's recs:
											</span>
											<Badge variant="outline">{algoRecsSelected.length}</Badge>
										</div>
										<div className="flex items-center justify-between">
											<span className="text-muted-foreground">
												From your deck:
											</span>
											<Badge variant="outline">
												{cardsUnreviewedActiveSelected.length}
											</Badge>
										</div>

										<div className="flex items-center justify-between">
											<span className="text-muted-foreground">
												Public library:
											</span>
											<Badge variant="outline">
												{libraryPhrasesSelected.length}
											</Badge>
										</div>
									</CardContent>
								</Card>
							</div>
							{!(meta.daily_review_goal > allCardsForToday.length) ? null : (
								<NotEnoughCards
									lang={lang}
									countNeeded={meta.daily_review_goal}
									totalCards={allCardsForToday.length}
								/>
							)}
							<div className="flex basis-80 flex-row flex-wrap justify-items-stretch gap-4">
								<Drawer>
									<DrawerTrigger asChild>
										<Button
											className="grow font-normal"
											variant="secondary"
											size="lg"
											disabled={algosEmpty}
										>
											<Sparkles /> Recommendations ({algosInitialCount})
										</Button>
									</DrawerTrigger>
									<SelectPhrasesToAddToReview
										lang={lang}
										algoRecsSelected={algoRecsSelected}
										setAlgoRecsSelected={setAlgoRecsSelected}
										algoRecsFiltered={algoRecsFiltered}
										// countOfCardsDesired={countNeeded2}
									/>
								</Drawer>
								<Button
									data-testid="start-review-button"
									onClick={(e) => {
										e.preventDefault()
										e.stopPropagation()
										mutate()
									}}
									size="lg"
									disabled={isPending || allCardsForToday.length === 0}
									className="grow"
								>
									<Rocket className="h-5 w-5" />
									Start Today's Review
								</Button>
							</div>
						</>
					}
				</CardContent>
			</Card>
		</>
	)
}
