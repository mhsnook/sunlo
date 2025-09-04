import type { CardStatusEnum, pids, uuid } from '@/types/main'
import { createFileRoute, Navigate } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import languages from '@/lib/languages'
import {
	BookOpen,
	CalendarClock,
	MessageSquare,
	MessageSquarePlus,
	Rocket,
	Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useMemo, useState } from 'react'
import { Drawer, DrawerTrigger } from '@/components/ui/drawer'
import Flagged from '@/components/flagged'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
	useInitialiseReviewStore,
	useReviewDayString,
	useReviewStage,
} from '@/lib/use-review-store'
import { arrayDifference, arrayUnion, min0 } from '@/lib/utils'
import { useDeckMeta, useDeckPids } from '@/lib/use-deck'
import supabase from '@/lib/supabase-client'
import {
	LanguageIsEmpty,
	LanguageFilteredIsEmpty,
} from '@/components/language-is-empty'
import { NotEnoughCards } from '@/components/review/not-enough-cards'
import { SelectPhrasesToAddToReview } from '@/components/review/select-phrases-to-add-to-review'
import { useAuth } from '@/lib/hooks'
import { useReviewsToday } from '@/lib/use-reviews'
import { ContinueReview } from '@/components/review/continue-review'
import { WhenComplete } from '@/components/review/when-review-complete-screen'
import { useCompositePids } from '@/hooks/composite-pids'

export const Route = createFileRoute('/_user/learn/$lang/review/')({
	component: ReviewPageSetup,
})

function ReviewPageSetup() {
	const { lang } = Route.useParams()
	const dayString = useReviewDayString()
	const stage = useReviewStage()
	const { userId } = useAuth()
	const { queryClient } = Route.useRouteContext()
	// const retrievabilityTarget = 0.9
	const { data: meta } = useDeckMeta(lang)
	const recs = useCompositePids(lang)
	const { data: deckPids } = useDeckPids(lang)
	const initLocalReviewState = useInitialiseReviewStore()
	const { data: manifestToRestore } = useReviewsToday(lang, dayString)

	if (meta?.lang !== lang)
		throw new Error("Attempted to build a review but we can't find the deck")
	if (!deckPids || !recs)
		throw new Error('Pids/recs should not be null here :/, even once')

	const today_active = deckPids.today_active

	// 1. we have today's active cards plus we need x more, based on user's goal
	const countNeeded = meta.daily_review_goal ?? 15

	// 2.
	// haven't built this feature yet, is why it's blank array
	// const friendRecsFromDB: pids = [] // useCardsRecommendedByFriends(lang)
	const friendRecsFiltered = useMemo(
		() =>
			arrayDifference(
				[] /* friendRecsFromDB */,
				[deckPids.reviewed_or_inactive]
			),
		[deckPids.reviewed_or_inactive /*, friendRecsFromDB */]
	)
	/*const [friendRecsSelected, setFriendRecsSelected] = useState<pids>(() =>
		friendRecsFiltered.slice(0, countNeeded)
	)*/
	const friendRecsSelected = friendRecsFiltered.slice(0, countNeeded)

	const countNeeded2 = min0(countNeeded - friendRecsSelected.length)

	// 3. algo recs set by user
	const algoRecsFiltered = useMemo(
		() => ({
			popular: arrayDifference(recs.top8.popular, [
				deckPids.reviewed_or_inactive,
				friendRecsFiltered,
			]),
			easiest: arrayDifference(recs.top8.easiest, [
				deckPids.reviewed_or_inactive,
				friendRecsFiltered,
			]),
			newest: arrayDifference(recs.top8.newest, [
				deckPids.reviewed_or_inactive,
				friendRecsFiltered,
			]),
		}),
		[recs.top8, deckPids.reviewed_or_inactive, friendRecsFiltered]
	)

	const [algoRecsSelected, setAlgoRecsSelected] = useState<pids>([])
	const countNeeded3 = min0(countNeeded2 - algoRecsSelected.length)
	const algosInitialCount =
		algoRecsFiltered.popular.length +
		algoRecsFiltered.easiest.length +
		algoRecsFiltered.newest.length
	const algosEmpty = algosInitialCount === 0

	// 4. deck cards
	// pull new unreviewed cards, excluding the friend recs we already got,
	// and limiting to the number we need from the deck
	const cardsUnreviewedActiveSelected = useMemo(() => {
		return arrayDifference(deckPids.unreviewed_active, [
			friendRecsSelected,
			algoRecsSelected,
		]).slice(0, countNeeded3)
	}, [
		countNeeded3,
		friendRecsSelected,
		algoRecsSelected,
		deckPids.unreviewed_active,
	])

	// the user does not get to preview or select these.
	// in many cases, we'll be done here because people will have 15+ cards
	// available in their deck. but if not...

	const countNeeded4 = min0(countNeeded3 - cardsUnreviewedActiveSelected.length)

	// 5. pick cards randomly from the library, if needed

	// sorting by pid is randomish, but stable
	const libraryPhrasesSelected = useMemo(
		() =>
			arrayDifference(recs.language_selectables, [
				friendRecsSelected,
				algoRecsSelected,
				cardsUnreviewedActiveSelected,
			])
				.sort((a, b) => (a > b ? -1 : 1))
				.slice(0, countNeeded4),
		[
			recs.language_selectables,
			friendRecsSelected,
			algoRecsSelected,
			cardsUnreviewedActiveSelected,
			countNeeded4,
		]
	)

	// 6. now let's just collate the cards we need to create on user_card table
	const freshCards = useMemo(
		() =>
			arrayUnion([
				friendRecsSelected, // 2
				algoRecsSelected, // 3
				cardsUnreviewedActiveSelected, // 4
				libraryPhrasesSelected, // 5
			]),
		[
			friendRecsSelected,
			algoRecsSelected,
			cardsUnreviewedActiveSelected,
			libraryPhrasesSelected,
		]
	)

	const cardsToCreate = useMemo(
		() => arrayDifference(freshCards, [deckPids.all]),
		[deckPids.all, freshCards]
	)

	const allCardsForToday = useMemo(
		() => arrayUnion([freshCards, today_active]),
		[freshCards, today_active]
	)

	// const countSurplusOrDeficit = freshCards.length - countNeeded
	const { mutate, isPending } = useMutation({
		mutationKey: ['user', lang, 'review', dayString, 'create'],
		mutationFn: async () => {
			const { data } = await supabase
				.from('user_card')
				.upsert(
					cardsToCreate.map((pid) => ({
						phrase_id: pid,
						lang,
						uid: userId!,
						status: 'active' as CardStatusEnum,
					}))
				)
				.select()
				.throwOnError()

			const newCardsCreated = data.map((c) => c.phrase_id)
			if (newCardsCreated.length !== cardsToCreate.length) {
				console.warn(
					`Error creating cards: expected ${cardsToCreate.length} but got ${newCardsCreated.length}`
				)
			}
			const { data: data2 } = await supabase
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

			// console.log(`I made the manifest:`, data2)

			return {
				total: allCardsForToday.length,
				cards_fresh: freshCards.length,
				cards_created: newCardsCreated.length,
				manifest: data2?.manifest as Array<uuid>,
			}
		},
		onSuccess: async (sums) => {
			toast.success(
				`Ready to go! ${sums.total} to study today, ${sums.cards_fresh} fresh new cards ready to go.`
			)
			if (sums.cards_created !== cardsToCreate.length)
				console.log(
					`Alert: unexpected mismatch between cards created and cards sent for creation: ${sums.cards_created}, ${cardsToCreate.length}`
				)
			if (
				!Array.isArray(sums.manifest) ||
				sums.manifest.length !== allCardsForToday.length
			)
				console.log(
					`Alert: unexpected mismatch between manifest before and after creation: ${allCardsForToday.length}, ${sums.manifest?.length}`,
					allCardsForToday,
					sums.manifest
				)

			initLocalReviewState(lang, dayString)
			await queryClient.refetchQueries({ queryKey: ['user', lang] })
		},
	})

	// when the manifest is present, skip this page, go to a better one
	if (manifestToRestore?.stats.count)
		return (
			manifestToRestore.stats.complete === manifestToRestore.stats.count ?
				<WhenComplete />
			: stage ? <Navigate to="/learn/$lang/review/go" from={Route.fullPath} />
			: <ContinueReview
					lang={lang}
					dayString={dayString}
					reviewStats={manifestToRestore.stats}
				/>
		)

	return (
		<Card>
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
										<span className="text-muted-foreground">Friend recs:</span>
										<Badge variant="outline">{friendRecsSelected.length}</Badge>
									</Flagged>
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">Sunlo's recs:</span>
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
						{!(countNeeded > allCardsForToday.length) ? null : (
							<NotEnoughCards
								lang={lang}
								countNeeded={countNeeded}
								newCardsCount={freshCards.length}
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
	)
}
