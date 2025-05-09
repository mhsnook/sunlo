import { pids } from '@/types/main'
import {
	createFileRoute,
	Link,
	Navigate,
	useNavigate,
} from '@tanstack/react-router'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import languages from '@/lib/languages'
import {
	BookOpen,
	CalendarClock,
	CheckCircle,
	ChevronRight,
	MessageCircleWarningIcon,
	MessageSquare,
	MessageSquarePlus,
	Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { useMemo, useState } from 'react'
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '@/components/ui/drawer'
import Flagged from '@/components/flagged'
import Callout from '@/components/ui/callout'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { getFromLocalStorage } from '@/lib/use-reviewables'
import { min0, todayString } from '@/lib/utils'
import { useDeckPidsAndRecs } from '@/lib/process-pids'
import { useDeckCardsMap, useDeckMeta, useDeckPids } from '@/lib/use-deck'
import supabase from '@/lib/supabase-client'
import { useLanguagePhrasesMap } from '@/lib/use-language'
import { useProfile } from '@/lib/use-profile'
import ExtraInfo from '@/components/extra-info'

export const Route = createFileRoute('/_user/learn/$lang/review/')({
	component: ReviewPage,
})

function ReviewPage() {
	const { lang } = Route.useParams()
	const { queryClient } = Route.useRouteContext()
	const dayString = todayString()
	// const retrievabilityTarget = 0.9
	const { data: deckPids } = useDeckPids(lang)
	const { data: meta } = useDeckMeta(lang)

	if (!meta?.id)
		throw new Error(
			"Attempted to build a review but we can't even find a deck ID"
		)
	const today_active = deckPids?.today_active ?? []

	const reviewData = useMemo(() => {
		const dailyCacheKey = ['user', lang, 'review', dayString]
		return { dailyCacheKey, pids: getFromLocalStorage<pids>(dailyCacheKey) }
	}, [lang, dayString])

	/* This interface has a bunch of steps that need to happen just right in order
	 * to give the user their 15 new cards, while giving them some control over what
	 * gets into their deck, while automating much of the selection of new cards.
	 *
	 *	1. We desire some `x` new cards (15, for now)
	 * 2. First priority is to pick up to x number of friend recommendations, `r`
	 * 	(maybe the user can deselect some). If a recommendation is for a phrase that
	 * 	is in the deck, it must be un-reviewed to count here.
	 * 	(This is currently hardcoded as [] because the feature is unbuilt)
	 * 3. Then if x - r is greater than zero we need `d` new cards desired from the deck;
	 * 	unreviewed cards; excluding all the friend recs; chosen at random.
	 * 4. Then if x - r - d is greater than zero, we need `l` new phrases from the algo;
	 * 	these are phrases not in the deck, not in friend recs, from the
	 * 	useDeckPidsAndRecs recommendations object.
	 * 5. Then if x - r - d - l is still greater than zero, we will pick `r` phrases at
	 * 	random, from recs.not_in_deck, excluding friend recs. Maybe we will not bother
	 * 	to exclude algo recs because then we have to care whether the user saw it or
	 * 	not, and we don't currently have a concept of an "ignored" recommendation (as
	 * 	the recs come from a stateless SQL view).
	 */

	const pids = useDeckPidsAndRecs(lang)
	if (pids === null)
		throw new Error('Pids should not be null here :/, even once')

	// 1.
	// const [countNewCardsDesired, setCountNewCardsDesired] = useState<number>(15)
	const countNewCardsDesired = 15

	// 2.
	// haven't built this feature yet, is why it's blank array
	const friendRecommendations: pids = [] // useCardsRecommendedByFriends(lang)
	const [selectedFriendRecommendations, setSelectedFriendRecommendations] =
		useState<pids>(() => friendRecommendations.slice(0, countNewCardsDesired))
	// from here on, if this array ^ is length 15 +, the rest of the code should be
	// idempotent / all sets should come up empty and cards desired = 0

	// just keeping as a set, for later exclusions
	const setOfAllFriendRecommendations = useMemo(
		() => new Set(friendRecommendations),
		[friendRecommendations]
	)

	// 3.
	// currently, this will always be the same as countNewCardsDesired
	const countNeededFromDeck = min0(
		countNewCardsDesired - selectedFriendRecommendations.length
	)

	// pull new unreviewed cards, excluding the friend recs we already got,
	// and limiting to the number we need from the deck
	const newCardsUnreviewedFromDeck = useMemo(() => {
		return Array.from(
			pids.unreviewed_active.difference(setOfAllFriendRecommendations)
		).slice(0, countNeededFromDeck)
	}, [
		countNeededFromDeck,
		selectedFriendRecommendations,
		pids.unreviewed_active,
	])
	// the user does not get to preview or select these.
	// in many cases, we'll be done here because people will have 15+ cards
	// available in their deck. but if not...

	// 4.
	const countNeededFromAlgo = min0(
		countNewCardsDesired -
			selectedFriendRecommendations.length -
			newCardsUnreviewedFromDeck.length
	)

	const cardsUnavailableForAlgo = useMemo(
		() => pids.deck /*.union(setOfAllFriendRecommendations)*/,
		[pids.deck /*, setOfAllFriendRecommendations*/]
	)
	// we will pass these into the recommendation-approver component
	// where the user will approve phrases
	const algoRecs = useMemo(
		() => ({
			popular: pids.top8.popular.difference(cardsUnavailableForAlgo),
			easiest: pids.top8.easiest
				.difference(cardsUnavailableForAlgo)
				.difference(pids.top8.easiest),
			newest: pids.top8.newest
				.difference(cardsUnavailableForAlgo)
				.difference(pids.top8.popular)
				.difference(pids.top8.easiest),
		}),
		[pids.top8, cardsUnavailableForAlgo]
	)
	// set by the user
	const [approvedAlgoRecs, setApprovedAlgoRecs] = useState<pids>([])
	const setOfApprovedAlgoRecs = useMemo(
		() => new Set(approvedAlgoRecs),
		[approvedAlgoRecs]
	)

	// 5. pick cards randomly from the library, if needed
	const countNeededFromLibraryRandom = min0(
		countNewCardsDesired -
			selectedFriendRecommendations.length -
			newCardsUnreviewedFromDeck.length -
			approvedAlgoRecs.length
	)

	// sorting by pid is randomish, but stable
	const randomSelection = useMemo(
		() =>
			Array.from(
				pids.not_in_deck
					.difference(setOfApprovedAlgoRecs)
					.difference(setOfAllFriendRecommendations)
			)
				.sort((a, b) => (a > b ? -1 : 1))
				.slice(0, countNeededFromLibraryRandom),
		[
			pids.not_in_deck,
			setOfApprovedAlgoRecs,
			setOfAllFriendRecommendations,
			countNeededFromLibraryRandom,
		]
	)

	// modify this when friend recs come; & only friend recs not already in deck
	const newCardsToCreate = [
		/* friendRecsNotInDeck */
		...approvedAlgoRecs,
		...randomSelection,
	]

	const navigate = useNavigate({ from: Route.fullPath })
	const {
		mutate,
		isPending,
		data: mutationData,
	} = useMutation({
		mutationKey: [...reviewData.dailyCacheKey, 'create'],
		mutationFn: async () => {
			const { data } = await supabase
				.from('user_card')
				.insert(
					newCardsToCreate.map((pid) => ({
						phrase_id: pid,
						user_deck_id: meta.id!,
					}))
				)
				.select()
				.throwOnError()

			const allCardsForToday = [
				/* friendRecsInDeck */
				...data.map((c) => c.phrase_id), // all new phrases
				...today_active, // previously scheduled phrases
			]

			localStorage.setItem(
				JSON.stringify(reviewData.dailyCacheKey),
				JSON.stringify(allCardsForToday)
			)
			return { total: allCardsForToday.length, new: newCardsToCreate.length }
		},
		onSuccess: (sums) => {
			toast.success(
				`Ready to go! ${sums.total} to study today, ${sums.new} fresh new cards ready to go.`
			)
			queryClient.invalidateQueries({ queryKey: ['user', lang, 'review'] })
			void navigate({ to: './go' })
		},
	})

	if (reviewData.pids && reviewData.pids.length) {
		// console.log(`This is the data we are doing a <Navigate> over:`, reviewData)
		return <Navigate to="/learn/$lang/review/go" params={{ lang }} />
	}

	const displayTotalCards =
		(deckPids?.today_active.length ?? 0) + newCardsToCreate.length

	const displayTotalNew = newCardsToCreate.length

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex flex-row justify-between">
					<div>Get Ready to review your {languages[lang]} cards</div>
					<ExtraInfo>
						<p>
							There are {today_active.length} cards waiting for you today based
							on previous reviews. Then we're going to collate{' '}
							{countNewCardsDesired} new cards for you (or more, if you
							choose!).
						</p>
						<p>
							There are {friendRecommendations.length} total friend
							recommendations, of which you've selected{' '}
							{selectedFriendRecommendations.length}. So you still need to get{' '}
							{countNeededFromDeck} more cards; we'll check in your deck,
							finding {newCardsUnreviewedFromDeck.length} fresh cards.
						</p>
						<p>
							That leaves {countNeededFromAlgo} to fetch from the algo, of which
							you've selected {approvedAlgoRecs.length}. This means we will pick{' '}
							{countNeededFromLibraryRandom} phrases just randomly from the
							library. And in total, we'll make {newCardsToCreate.length} new
							cards either due to friend/algo recs or randomly from the lib.
						</p>
					</ExtraInfo>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-muted-foreground max-w-2xl text-lg">
					Your personalized review session is prepared and waiting for you.
					Here's what to expect...
				</p>
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
								{displayTotalCards}
							</p>
							<p className="text-muted-foreground">cards to work on today</p>
						</CardContent>
					</Card>

					<Card className="grow basis-40">
						<CardHeader className="pb-2">
							<CardTitle className="text-xl">New Phrases</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="flex flex-row items-center justify-start gap-2 text-4xl font-bold text-green-500">
								<MessageSquarePlus />
								<span>{displayTotalNew}</span>
							</p>
							<p className="text-muted-foreground">
								cards you haven't seen before
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
								<span>{deckPids?.today_active.length}</span>
							</p>
							<p className="text-muted-foreground">
								scheduled based on past reviews
							</p>
						</CardContent>
					</Card>
					<Flagged name="smart_recommendations" className="hidden">
						<Card className="grow basis-40">
							<CardHeader className="pb-2">
								<CardTitle className="flex items-center gap-2 text-xl">
									<MessageSquare className="text-primary" />
									Sources
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								<Flagged name="friend_recommendations">
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">Friend recs:</span>
										<Badge variant="outline">
											{selectedFriendRecommendations.length} from friends
										</Badge>
									</div>
								</Flagged>
								<Flagged name="smart_recommendations">
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">Sunlo's recs:</span>
										<Badge variant="outline">{approvedAlgoRecs.length}</Badge>
									</div>
								</Flagged>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">From your deck:</span>
									<Badge variant="outline">
										{newCardsUnreviewedFromDeck.length}
									</Badge>
								</div>
								<Flagged name="smart_recommendations">
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">
											Public library:
										</span>
										<Badge variant="outline">{randomSelection.length}</Badge>
									</div>
								</Flagged>
							</CardContent>
						</Card>
					</Flagged>
				</div>
				{!(countNewCardsDesired > displayTotalCards) ? null : (
					<NotEnoughCards
						lang={lang}
						countNewCardsDesired={countNewCardsDesired}
						newCardsCount={displayTotalNew}
						totalCards={displayTotalCards}
					/>
				)}
				<div className="flex flex-col justify-center gap-4 @xl:flex-row">
					<Button
						onClick={(e) => {
							e.preventDefault()
							e.stopPropagation()
							mutate()
						}}
						size="lg"
						disabled={isPending || displayTotalCards === 0}
					>
						Okay, let's get started <ChevronRight className="ml-2 h-5 w-5" />
					</Button>
					<Flagged name="smart_recommendations">
						<Drawer>
							<DrawerTrigger asChild>
								<Button className="font-normal" variant="outline" size="lg">
									Customize my session
								</Button>
							</DrawerTrigger>
							<ReviewCardsToAddToDeck
								lang={lang}
								approvedAlgoRecs={approvedAlgoRecs}
								setApprovedAlgoRecs={setApprovedAlgoRecs}
								algoRecs={algoRecs}
								coundOfCardsDesired={countNeededFromAlgo}
							/>
						</Drawer>
					</Flagged>
				</div>
			</CardContent>
		</Card>
	)
}

function ReviewCardsToAddToDeck({
	lang,
	approvedAlgoRecs,
	setApprovedAlgoRecs,
	algoRecs,
	coundOfCardsDesired,
}: {
	lang: string
	approvedAlgoRecs: pids
	setApprovedAlgoRecs: (recs: pids) => void
	algoRecs: { popular: Set<string>; easiest: Set<string>; newest: Set<string> }
	coundOfCardsDesired: number
}) {
	const { data: cardsMap } = useDeckCardsMap(lang)
	const { data: phrasesMap } = useLanguagePhrasesMap(lang)
	if (!phrasesMap || !cardsMap)
		throw new Error(
			"Attempting to present this new-cards-algo-review interface but can't load cardsMap or phrasesMap"
		)
	const { data: profile } = useProfile()
	if (!profile)
		throw new Error(
			'Profile should be here on first render, but it is not showing up'
		)
	const translation_langs = [
		profile.language_primary,
		...profile.languages_spoken,
	]
	// Toggle card selection
	const toggleCardSelection = (pid1: string) => {
		const updatedRecs =
			approvedAlgoRecs.indexOf(pid1) === -1 ?
				[...approvedAlgoRecs, pid1]
			:	approvedAlgoRecs.filter((pid2) => pid1 !== pid2)
		setApprovedAlgoRecs(updatedRecs)
	}
	const allAlgoRecsInOneSet = algoRecs.popular
		.union(algoRecs.easiest)
		.union(algoRecs.newest)

	const countAllAlgoRecs = allAlgoRecsInOneSet.size

	return (
		<DrawerContent aria-describedby="drawer-description">
			<div className="@container relative mx-auto w-full max-w-prose overflow-y-auto">
				<DrawerHeader className="bg-background sticky top-0">
					<DrawerTitle className="sticky top-0 flex items-center gap-2 text-xl">
						<Sparkles className="h-5 w-5 text-purple-500" />
						Recommended for you ({approvedAlgoRecs.length} of {countAllAlgoRecs}{' '}
						selected)
					</DrawerTitle>
				</DrawerHeader>
				<div className="grid gap-3 p-4 @lg:grid-cols-2">
					<DrawerDescription className="col-span-2">
						Review and select which recommended cards you want to include in
						your session
					</DrawerDescription>
					{Array.from(allAlgoRecsInOneSet).map((pid) => {
						const selected = approvedAlgoRecs.indexOf(pid) > -1
						return (
							<Card
								onClick={() => toggleCardSelection(pid)}
								key={pid}
								className={`hover:bg-primary/20 cursor-pointer border-1 transition-all ${selected ? 'border-primary bg-primary/10' : ''}`}
							>
								<CardHeader className="p-3 pb-0">
									<CardTitle className="text-base">
										{phrasesMap[pid].text}
									</CardTitle>
									<CardDescription>
										{phrasesMap[pid].translations[0].text}
									</CardDescription>
								</CardHeader>
								<CardFooter className="flex justify-end p-3 pt-0">
									<Badge
										variant={selected ? 'default' : 'outline'}
										className="grid grid-cols-1 grid-rows-1 place-items-center font-normal [grid-template-areas:'stack']"
									>
										<span
											className={`flex flex-row items-center gap-1 [grid-area:stack] ${selected ? '' : 'invisible'}`}
										>
											<CheckCircle className="mr-1 h-3 w-3" /> Selected
										</span>
										<span
											className={`[grid-area:stack] ${selected ? 'invisible' : ''}`}
										>
											Tap to select
										</span>
									</Badge>
								</CardFooter>
							</Card>
						)
					})}
				</div>
			</div>
		</DrawerContent>
	)
}

function NotEnoughCards({
	lang,
	countNewCardsDesired,
	newCardsCount,
	totalCards,
}: {
	lang: string
	countNewCardsDesired: number
	newCardsCount: number
	totalCards: number
}) {
	const noCards = totalCards === 0
	return (
		<Callout variant="ghost" Icon={() => <MessageCircleWarningIcon />}>
			<p>
				It looks like you don't have {noCards ? 'any' : 'enough new'} cards
				{noCards ?
					" to review. You'll have to add at least a few before you can proceed"
				:	<>
						in your deck to meet your goal of{' '}
						<strong className="italic">
							{countNewCardsDesired} new cards a day
						</strong>
					</>
				}
				.
			</p>
			<div className="my-2 flex flex-col gap-2 @lg:flex-row">
				<Link
					className={buttonVariants({ variant: 'outline' })}
					to="/learn/$lang/library"
					params={{ lang }}
				>
					Add cards from the Library
				</Link>

				<Link
					className={buttonVariants({ variant: 'outline' })}
					to="/learn/$lang/add-phrase"
					params={{ lang }}
				>
					Create new cards
				</Link>
			</div>
			{noCards ? null : (
				<>
					Or click the big button below and get started with the {newCardsCount}{' '}
					cards you have.
				</>
			)}
		</Callout>
	)
}
