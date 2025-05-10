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
import { arrayDifference, arrayUnion, min0, todayString } from '@/lib/utils'
import { useDeckPidsAndRecs } from '@/lib/process-pids'
import { useDeckCardsMap, useDeckMeta, useDeckPids } from '@/lib/use-deck'
import supabase from '@/lib/supabase-client'
import { useLanguagePhrasesMap } from '@/lib/use-language'
import { useProfile } from '@/lib/use-profile'
import ExtraInfo from '@/components/extra-info'
import { Database } from '@/types/supabase'

export const Route = createFileRoute('/_user/learn/$lang/review/')({
	component: ReviewPage,
})

function ReviewPage() {
	const { lang } = Route.useParams()
	const { queryClient } = Route.useRouteContext()
	const dayString = todayString()
	// const retrievabilityTarget = 0.9
	const { data: meta } = useDeckMeta(lang)
	const { data: deckPids } = useDeckPids(lang)
	const pids = useDeckPidsAndRecs(lang)

	if (!meta?.id)
		throw new Error(
			"Attempted to build a review but we can't even find a deck ID"
		)
	if (!deckPids)
		throw new Error(
			"Attempting to build a review but we can't find deckPids data"
		)
	if (pids === null)
		throw new Error('Pids should not be null here :/, even once')

	const today_active = deckPids.today_active

	const reviewData = useMemo(() => {
		const dailyCacheKey = ['user', lang, 'review', dayString]
		return { dailyCacheKey, pids: getFromLocalStorage<pids>(dailyCacheKey) }
	}, [lang, dayString])

	/* This interface has a bunch of steps that need to happen just right in order
	 * to give the user their 15 new cards, while giving them some control over what
	 * gets into their deck, while automating much of the selection of new cards.
	 *
	 *	1. We have a goal of some `x` new cards daily (15, for now), in addition to today's
	 * 	active/scheduled cards, `s`
	 * 2. First priority is to pick up to x number of friend recommendations, `r`.
	 * 	Filter out cards with reviews. The user can select/approve them, and what
	 * 	remains is `selectedFriendRecs` with length r.
	 * 	(This is currently hardcoded as [] because the feature is unbuilt)
	 * 	x - r = x2
	 * 3. Then if x2 is a positive number, we still need that many new cards to study.
	 * 	So we start with algo recs because they're fun; we show them 4 cards from each
	 * 	of the top8 lists, so long as they have no deck reviews, and the user can
	 * 	approve them, building `selectedAlgoRecs`, with length a.
	 * 	x2 - r = x3
	 * 	Note: algo recs will not filter based on any other status like deck status. This
	 * 	means the algo section can sort of function to "bump" cards that are unreviewed,
	 * 	just chilling in the deck, but which are popular or easy.
	 * 4. If x3 is still a positive number, we will take the first `d` cards from the deck.
	 * 	x3 - a = x4
	 * 5. If x4 is still a positive number, we will choose the remainder from the library, `l`.
	 * 	x4 - d = x5
	 *		If x5 > l, we will simply not have enough cards.
	 * 6. Metadata wise: the total new cards is going to be something close to r + a + l, and
	 * 	total cards will be s + r + a + d + l. To keep things simple we should always filter
	 * 	out cards _selected_ in the previous step, as well as cards with reviews, and cards
	 * 	with status 'learned' or 'skipped'.
	 *
	 */

	// 1. we have today's active cards plus we need x more
	// const [countNeeded, setCountNeeded] = useState<number>(15)
	const countNeeded = 15

	// 2.
	// haven't built this feature yet, is why it's blank array
	const friendRecsFromDB: pids = [] // useCardsRecommendedByFriends(lang)
	const friendRecsFiltered = useMemo(
		() => arrayDifference(friendRecsFromDB, [pids.reviewed_or_inactive]),
		[pids.reviewed_or_inactive, friendRecsFromDB]
	)
	const [friendRecsSelected, setFriendRecsSelected] = useState<pids>(() =>
		friendRecsFiltered.slice(0, countNeeded)
	)
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
				pids.top8.easiest,
			]),
			newest: arrayDifference(pids.top8.newest, [
				pids.reviewed_or_inactive,
				friendRecsFiltered,
				pids.top8.popular,
				pids.top8.easiest,
			]),
		}),
		[pids.top8, pids.reviewed_or_inactive, friendRecsFiltered]
	)

	const [algoRecsSelected, setAlgoRecsSelected] = useState<pids>([])
	const countNeeded3 = min0(countNeeded2 - algoRecsSelected.length)

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
		() => arrayUnion([today_active, freshCards]),
		[freshCards, today_active]
	)

	const countSurplusOrDeficit = freshCards.length - countNeeded

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

			localStorage.setItem(
				JSON.stringify(reviewData.dailyCacheKey),
				JSON.stringify(allCardsForToday)
			)
			return {
				total: allCardsForToday.length,
				cards_fresh: freshCards.length,
				cards_created: newCardsCreated.length,
			}
		},
		onSuccess: (sums) => {
			toast.success(
				`Ready to go! ${sums.total} to study today, ${sums.cards_fresh} fresh new cards ready to go.`
			)
			queryClient.invalidateQueries({ queryKey: ['user', lang, 'review'] })
			void navigate({ to: './go' })
		},
	})

	if (reviewData.pids && reviewData.pids.length) {
		// console.log(`This is the data we are doing a <Navigate> over:`, reviewData)
		return <Navigate to="/learn/$lang/review/go" params={{ lang }} />
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex flex-row justify-between">
					<div>Get Ready to review your {languages[lang]} cards</div>
					<ExtraInfo title="Explaining today's review cards">
						<p>
							<strong>{today_active.length} cards</strong> scheduled based on
							previous reviews. <br />
							<strong>{countNeeded} new cards</strong> is your goal for new
							cards each day.
							<br />
							<strong>{freshCards.length} new cards</strong> have been selected
							for you/by you. <br />
							<strong>{Math.abs(countSurplusOrDeficit)} cards</strong>{' '}
							{countSurplusOrDeficit > 0 ? 'above' : 'less than'} your daily
							goal.
							<br />
							(of which {cardsToCreate.length} were not previously in your
							deck).
							<br />
							<strong>{allCardsForToday.length} total cards</strong> are lined
							up for your review today.
						</p>
						<Flagged name="friend_recommendations">
							<p>
								There are {friendRecsFiltered.length} friend recommendations, of
								which you've selected {friendRecsSelected.length}. So you still
								need to get {countNeeded2} countNeeded2.
							</p>
						</Flagged>
						<p>
							We offered some recs from the algorithm, and you selected{' '}
							{algoRecsSelected.length} selectedAlgoRecs, meaning you still need{' '}
							{countNeeded3}.
						</p>
						<p>
							Next we went looking in your deck for cards you've selected, but
							haven't reviewed before: there are {pids.unreviewed_active.length}{' '}
							of them (out of {pids.deck.length} total in your deck), and we
							managed to get {cardsUnreviewedActiveSelected.length} of them
							(unsure why there would ever be a discrepancy here), leaving{' '}
							{countNeeded4} to pull from the library.
						</p>
						<p>
							We have {pids.not_in_deck} cards in the library that aren't
							already in your deck or weren't chosen from the recommendations,
							the {pids.language.length} total phrases in the library and found{' '}
							{pids.not_in_deck.length} which are not in your deck, and we
							grabbed {libraryPhrasesSelected.length} of them.
						</p>
						<p>
							So the total number of cards is {allCardsForToday.length}, which
							is {today_active.length} scheduled + {friendRecsSelected.length}{' '}
							friend recs + {algoRecsSelected.length} algo recs +{' '}
							{cardsUnreviewedActiveSelected.length} deck +{' '}
							{libraryPhrasesSelected.length} library ={' '}
							{today_active.length +
								friendRecsSelected.length +
								algoRecsSelected.length +
								cardsUnreviewedActiveSelected.length +
								libraryPhrasesSelected.length}
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
								{allCardsForToday.length}
							</p>
							<p className="text-muted-foreground">cards to work on today</p>
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
								<span className="text-muted-foreground">From your deck:</span>
								<Badge variant="outline">
									{cardsUnreviewedActiveSelected.length}
								</Badge>
							</div>

							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Public library:</span>
								<Badge variant="outline">{libraryPhrasesSelected.length}</Badge>
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
				<div className="flex flex-col justify-center gap-4 @xl:flex-row">
					<Button
						onClick={(e) => {
							e.preventDefault()
							e.stopPropagation()
							mutate()
						}}
						size="lg"
						disabled={isPending || allCardsForToday.length === 0}
					>
						Okay, let's get started <ChevronRight className="ml-2 h-5 w-5" />
					</Button>
					<Drawer>
						<DrawerTrigger asChild>
							<Button className="font-normal" variant="outline" size="lg">
								Customize my session
							</Button>
						</DrawerTrigger>
						<ReviewCardsToAddToDeck
							lang={lang}
							algoRecsSelected={algoRecsSelected}
							setAlgoRecsSelected={setAlgoRecsSelected}
							algoRecsFiltered={algoRecsFiltered}
							// countOfCardsDesired={countNeeded2}
						/>
					</Drawer>
				</div>
			</CardContent>
		</Card>
	)
}

function ReviewCardsToAddToDeck({
	lang,
	algoRecsSelected,
	setAlgoRecsSelected,
	algoRecsFiltered,
	// countOfCardsDesired,
}: {
	lang: string
	algoRecsSelected: pids
	setAlgoRecsSelected: (recs: pids) => void
	algoRecsFiltered: {
		popular: Array<string>
		easiest: Array<string>
		newest: Array<string>
	}
	// countOfCardsDesired: number
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
			algoRecsSelected.indexOf(pid1) === -1 ?
				[...algoRecsSelected, pid1]
			:	algoRecsSelected.filter((pid2) => pid1 !== pid2)
		setAlgoRecsSelected(updatedRecs)
	}
	const allAlgoRecs = arrayUnion([
		algoRecsFiltered.popular,
		algoRecsFiltered.easiest,
		algoRecsFiltered.newest,
	])

	return (
		<DrawerContent aria-describedby="drawer-description">
			<div className="@container relative mx-auto w-full max-w-prose overflow-y-auto">
				<DrawerHeader className="bg-background sticky top-0">
					<DrawerTitle className="sticky top-0 flex items-center gap-2 text-xl">
						<Sparkles className="h-5 w-5 text-purple-500" />
						Recommended for you ({algoRecsSelected.length} of{' '}
						{allAlgoRecs.length} selected)
					</DrawerTitle>
				</DrawerHeader>
				<div className="grid gap-3 p-4 @lg:grid-cols-2">
					<DrawerDescription className="col-span-2">
						Review and select which recommended cards you want to include in
						your session
					</DrawerDescription>
					{allAlgoRecs.map((pid) => {
						const selected = algoRecsSelected.indexOf(pid) > -1
						// @@TODO move this logic obv
						console.log(
							`being very loud about filtering phrases and translation languages in the wrong place`
						)
						let phrase = phrasesMap[pid]
						// filter to only spoken languages, sort primary first
						phrase.translations = phrase.translations
							.filter((t) => translation_langs.indexOf(t.lang) > -1)
							.toSorted((a, b) => {
								return a.lang === b.lang ?
										0
									:	translation_langs.indexOf(a.lang) -
											translation_langs.indexOf(b.lang)
							})
						if (phrase.translations.length === 0) {
							console.log('skipping a phrase with no usable translations')
							return null
						}

						return (
							<Card
								onClick={() => toggleCardSelection(pid)}
								key={pid}
								className={`hover:bg-primary/20 cursor-pointer border-1 transition-all ${selected ? 'border-primary bg-primary/10' : ''}`}
							>
								<CardHeader className="p-3 pb-0">
									<CardTitle className="text-base">{phrase.text}</CardTitle>
									<CardDescription>
										{phrase.translations[0].text}
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
	countNeeded,
	newCardsCount,
	totalCards,
}: {
	lang: string
	countNeeded: number
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
						<strong className="italic">{countNeeded} new cards a day</strong>
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
