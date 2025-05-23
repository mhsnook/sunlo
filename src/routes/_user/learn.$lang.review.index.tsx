import { DailyCacheKey, pids } from '@/types/main'
import {
	createFileRoute,
	Navigate,
	useNavigate,
	useRouter,
} from '@tanstack/react-router'
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
	getExtrasFromLocalStorage,
	getManifestFromLocalStorage,
	setManifestFromLocalStorage,
} from '@/lib/use-reviewables'
import { arrayDifference, arrayUnion, min0, todayString } from '@/lib/utils'
import { useDeckPidsAndRecs } from '@/lib/process-pids'
import { useDeckMeta } from '@/lib/use-deck'
import supabase from '@/lib/supabase-client'
import { Database } from '@/types/supabase'
import {
	LanguageIsEmpty,
	LanguageFilteredIsEmpty,
} from '@/components/language-is-empty'
import { NotEnoughCards } from '@/components/review/not-enough-cards'
import { SelectPhrasesToAddToReview } from '@/components/review/select-phrases-to-add-to-review'
import { ExplainTodaysReview } from '@/components/review/explain-todays-review'

export const Route = createFileRoute('/_user/learn/$lang/review/')({
	component: ReviewPage,
})

function ReviewPage() {
	const { lang } = Route.useParams()
	const { queryClient } = Route.useRouteContext()
	// const retrievabilityTarget = 0.9
	const { data: meta } = useDeckMeta(lang)
	const pids = useDeckPidsAndRecs(lang)
	const [dailyCacheKey] = useState<DailyCacheKey>(() => [
		'user',
		lang,
		'review',
		todayString(),
	])

	if (!meta?.id)
		throw new Error(
			"Attempted to build a review but we can't even find a deck ID"
		)
	if (pids === null)
		throw new Error('Pids should not be null here :/, even once')

	const today_active = pids.today_active

	// 1. we have today's active cards plus we need x more
	// const [countNeeded, setCountNeeded] = useState<number>(15)
	const countNeeded = 15

	// 2.
	// haven't built this feature yet, is why it's blank array
	// const friendRecsFromDB: pids = [] // useCardsRecommendedByFriends(lang)
	const friendRecsFiltered = useMemo(
		() =>
			arrayDifference([] /* friendRecsFromDB */, [pids.reviewed_or_inactive]),
		[pids.reviewed_or_inactive /*, friendRecsFromDB */]
	)
	/*const [friendRecsSelected, setFriendRecsSelected] = useState<pids>(() =>
		friendRecsFiltered.slice(0, countNeeded)
	)*/
	const friendRecsSelected = friendRecsFiltered.slice(0, countNeeded)

	const countNeeded2 = min0(countNeeded - friendRecsSelected.length)

	// 3. algo recs set by user
	const algoRecsFiltered = useMemo(
		() => ({
			popular: arrayDifference(pids.top8.popular, [
				pids.reviewed_or_inactive,
				friendRecsFiltered,
			]),
			easiest: arrayDifference(pids.top8.easiest, [
				pids.reviewed_or_inactive,
				friendRecsFiltered,
			]),
			newest: arrayDifference(pids.top8.newest, [
				pids.reviewed_or_inactive,
				friendRecsFiltered,
			]),
		}),
		[pids.top8, pids.reviewed_or_inactive, friendRecsFiltered]
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
		return arrayDifference(pids.unreviewed_active, [
			friendRecsSelected,
			algoRecsSelected,
		]).slice(0, countNeeded3)
	}, [
		countNeeded3,
		friendRecsSelected,
		algoRecsSelected,
		pids.unreviewed_active,
	])

	// the user does not get to preview or select these.
	// in many cases, we'll be done here because people will have 15+ cards
	// available in their deck. but if not...

	const countNeeded4 = min0(countNeeded3 - cardsUnreviewedActiveSelected.length)

	// 5. pick cards randomly from the library, if needed

	// sorting by pid is randomish, but stable
	const libraryPhrasesSelected = useMemo(
		() =>
			arrayDifference(pids.language_selectables, [
				friendRecsSelected,
				algoRecsSelected,
				cardsUnreviewedActiveSelected,
			])
				.sort((a, b) => (a > b ? -1 : 1))
				.slice(0, countNeeded4),
		[
			pids.language_selectables,
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
		() => arrayDifference(freshCards, [pids.deck]),
		[pids.deck, freshCards]
	)

	const allCardsForToday = useMemo(
		() => arrayUnion([freshCards, today_active]),
		[freshCards, today_active]
	)

	const countSurplusOrDeficit = freshCards.length - countNeeded
	const router = useRouter()
	const navigate = useNavigate({ from: Route.fullPath })
	const { mutate, isPending } = useMutation({
		mutationKey: [...dailyCacheKey, 'create'],
		mutationFn: async () => {
			const { data } = await supabase
				.from('user_card')
				.upsert(
					cardsToCreate.map((pid) => ({
						phrase_id: pid,
						user_deck_id: meta.id!,
						status: 'active' as Database['public']['Enums']['card_status'],
					}))
				)
				.select()
				.throwOnError()

			const newCardsCreated = data.map((c) => c.phrase_id)

			setManifestFromLocalStorage(dailyCacheKey, allCardsForToday)

			return {
				total: allCardsForToday.length,
				cards_fresh: freshCards.length,
				cards_created: newCardsCreated.length,
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
			const clear1 = queryClient.invalidateQueries({ queryKey: ['user', lang] })
			const clear2 = router.invalidate({ sync: true })
			await Promise.all([clear1, clear2])
			void navigate({ to: './go' })
		},
	})

	const reviewPids = getManifestFromLocalStorage(dailyCacheKey)
	if (reviewPids && reviewPids.length)
		return <Navigate to="/learn/$lang/review/go" params={{ lang }} />

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex flex-row justify-between">
					<div>Get Ready to review your {languages[lang]} cards</div>
					<ExplainTodaysReview
						today_active={today_active}
						countNeeded={countNeeded}
						freshCards={freshCards}
						countSurplusOrDeficit={countSurplusOrDeficit}
						cardsToCreate={cardsToCreate}
						allCardsForToday={allCardsForToday}
						friendRecsFiltered={friendRecsFiltered}
						friendRecsSelected={friendRecsSelected}
						countNeeded2={countNeeded2}
						algoRecsFiltered={algoRecsFiltered}
						algoRecsSelected={algoRecsSelected}
						countNeeded3={countNeeded3}
						pids={pids}
						cardsUnreviewedActiveSelected={cardsUnreviewedActiveSelected}
						countNeeded4={countNeeded4}
						libraryPhrasesSelected={libraryPhrasesSelected}
					/>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-muted-foreground max-w-2xl text-lg">
					Your personalized review session is prepared and waiting for you.
					Here's what to expect...
				</p>
				{pids.language.length === 0 ?
					<LanguageIsEmpty lang={lang} />
				: pids.language_filtered.length === 0 ?
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
										<span>{pids.today_active.length}</span>
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
										<Sparkles /> View Recommendations ({algosInitialCount})
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
