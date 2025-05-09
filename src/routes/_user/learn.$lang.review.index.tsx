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
import { Database } from '@/types/supabase'

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
	const setOfTodayActive = new Set(today_active)

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
	 * 	with status 'learned' or 'skipped'
	 *
	 */

	const pids = useDeckPidsAndRecs(lang)
	if (pids === null)
		throw new Error('Pids should not be null here :/, even once')

	// 1. we have today's active cards plus we need x more
	// const [countNeeded, setCountNeeded] = useState<number>(15)
	const countNeeded = 15

	// 2.
	// haven't built this feature yet, is why it's blank array
	const friendRecs: pids = [] // useCardsRecommendedByFriends(lang)
	const setOfFriendRecs = new Set(friendRecs).difference(setOfTodayActive)
	const [selectedFriendRecs, setSelectedFriendRecs] = useState<pids>(() =>
		Array.from(setOfFriendRecs).slice(0, countNeeded)
	)
	// from here on, if this array ^ is length 15 +, the rest of the code should be
	// idempotent / all sets should come up empty and cards desired = 0

	// just keeping as a set, for later exclusions
	const setOfSelectedFriendRecs = useMemo(
		() => new Set(selectedFriendRecs),
		[selectedFriendRecs]
	)

	// currently, this will always be the same as countNeeded
	const countNeeded2 = min0(countNeeded - selectedFriendRecs.length)

	// 3. algo recs set by user
	const [selectedAlgoRecs, setSelectedAlgoRecs] = useState<pids>([])
	// pass this into the recommendation-approver component
	const algoRecs = useMemo(
		() => ({
			popular: pids.top8.popular.difference(pids.reviewed_or_inactive),
			easiest: pids.top8.easiest
				.difference(pids.reviewed_or_inactive)
				.difference(pids.top8.easiest),
			newest: pids.top8.newest
				.difference(pids.reviewed_or_inactive)
				.difference(pids.top8.popular)
				.difference(pids.top8.easiest),
		}),
		[pids.top8, pids.reviewed_or_inactive]
	)

	const setOfSelectedAlgoRecs = useMemo(
		() => new Set(selectedAlgoRecs),
		[selectedAlgoRecs]
	)

	const countNeeded3 = min0(countNeeded2 - selectedAlgoRecs.length)

	// 4. deck cards
	// pull new unreviewed cards, excluding the friend recs we already got,
	// and limiting to the number we need from the deck
	const selectedCardsUnreviewedActive = useMemo(() => {
		return Array.from(
			pids.unreviewed_active
				.difference(setOfSelectedFriendRecs)
				.difference(setOfSelectedAlgoRecs)
		).slice(0, countNeeded3)
	}, [countNeeded3, setOfSelectedFriendRecs, pids.unreviewed_active])

	const setOfSelectedCardsUnreviewedActive = new Set(
		selectedCardsUnreviewedActive
	)

	// the user does not get to preview or select these.
	// in many cases, we'll be done here because people will have 15+ cards
	// available in their deck. but if not...

	const countNeeded4 = min0(countNeeded3 - selectedCardsUnreviewedActive.length)

	// 5. pick cards randomly from the library, if needed

	// sorting by pid is randomish, but stable
	const selectedLibraryPhrases = useMemo(
		() =>
			Array.from(
				pids.language_selectables
					.difference(setOfSelectedFriendRecs)
					.difference(setOfSelectedAlgoRecs)
					.difference(setOfSelectedCardsUnreviewedActive)
			)
				.sort((a, b) => (a > b ? -1 : 1))
				.slice(0, countNeeded4),
		[
			pids.language_selectables,
			setOfSelectedFriendRecs,
			setOfSelectedAlgoRecs,
			countNeeded,
		]
	)

	// 6. now let's just collate the cards we need to create on user_card table
	const newCardsToCreate = [
		/* selectedFriendRecs.difference(pids.deck) */
		...selectedAlgoRecs,
		...selectedLibraryPhrases,
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
				.upsert(
					newCardsToCreate.map((pid) => ({
						phrase_id: pid,
						user_deck_id: meta.id!,
						status: 'active' as Database['public']['Enums']['card_status'],
					}))
				)
				.select()
				.throwOnError()

			const newCardsCreated = data.map((c) => c.phrase_id)
			const allCardsForToday = new Set([
				...today_active, // 1
				...selectedFriendRecs, // 2
				...newCardsCreated, // 3 & 5
				...selectedCardsUnreviewedActive, // 4
			])

			localStorage.setItem(
				JSON.stringify(reviewData.dailyCacheKey),
				JSON.stringify(Array.from(allCardsForToday))
			)
			return { total: allCardsForToday.size, new: newCardsCreated.length }
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
		(deckPids?.today_active.length ?? 0) +
		newCardsToCreate.length +
		selectedCardsUnreviewedActive.length

	const displayTotalNew = newCardsToCreate.length

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex flex-row justify-between">
					<div>Get Ready to review your {languages[lang]} cards</div>
					<ExtraInfo>
						<p>
							There are {today_active.length} today_active cards waiting for you
							today based on previous reviews. Then we're going to collate{' '}
							{countNeeded} cards_needed new cards for you (or more, if you
							choose!).
						</p>
						<p>
							There are {friendRecs.length} friendRecs, of which you've selected{' '}
							{selectedFriendRecs.length} selectedFriendRecs. So you still need
							to get {countNeeded2} countNeeded2.
						</p>
						<p>
							We offered some recs from the algo and you selected{' '}
							{selectedAlgoRecs.length} selectedAlgoRecs, meaning you still need{' '}
							{countNeeded3} countNeeded3.
						</p>
						<p>
							We picked from cards in your deck ({pids.deck.size} cards) that
							are unreviewed and active ({pids.unreviewed_active.size}) and not
							already in the review process or inactive (
							{pids.reviewed_or_inactive.size}), and grabbed{' '}
							{selectedCardsUnreviewedActive.length} there, leaving{' '}
							{countNeeded4} to pull just at random from the library, where we
							found {selectedLibraryPhrases.length} out of the{' '}
							{pids.language.size} total phrases and{' '}
							{pids.language.size - pids.deck.size} not in deck.
						</p>
						<p>
							So the total number of cards is {displayTotalCards}, which is s +
							r + a + d + l, or {today_active.length} +{' '}
							{selectedFriendRecs.length} + {selectedAlgoRecs.length} +{' '}
							{selectedCardsUnreviewedActive.length} +{' '}
							{selectedLibraryPhrases.length} ={' '}
							{today_active.length +
								selectedFriendRecs.length +
								selectedAlgoRecs.length +
								selectedCardsUnreviewedActive.length +
								selectedLibraryPhrases.length}
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
								<span>
									{displayTotalNew + selectedCardsUnreviewedActive.length}
								</span>
							</p>
							<p className="text-muted-foreground">
								cards you haven't seen before, {selectedAlgoRecs.length} from
								algo, {selectedCardsUnreviewedActive.length} from your deck,{' '}
								{selectedFriendRecs.length} from friends,{' '}
								{selectedLibraryPhrases.length} chosen from the library.
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
											{selectedFriendRecs.length} from friends
										</Badge>
									</div>
								</Flagged>
								<Flagged name="smart_recommendations">
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">Sunlo's recs:</span>
										<Badge variant="outline">{selectedAlgoRecs.length}</Badge>
									</div>
								</Flagged>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">From your deck:</span>
									<Badge variant="outline">
										{selectedCardsUnreviewedActive.length}
									</Badge>
								</div>
								<Flagged name="smart_recommendations">
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">
											Public library:
										</span>
										<Badge variant="outline">
											{selectedLibraryPhrases.length}
										</Badge>
									</div>
								</Flagged>
							</CardContent>
						</Card>
					</Flagged>
				</div>
				{!(countNeeded > displayTotalCards) ? null : (
					<NotEnoughCards
						lang={lang}
						countNeeded={countNeeded}
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
								selectedAlgoRecs={selectedAlgoRecs}
								setSelectedAlgoRecs={setSelectedAlgoRecs}
								algoRecs={algoRecs}
								countOfCardsDesired={countNeeded2}
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
	selectedAlgoRecs,
	setSelectedAlgoRecs,
	algoRecs,
	countOfCardsDesired,
}: {
	lang: string
	selectedAlgoRecs: pids
	setSelectedAlgoRecs: (recs: pids) => void
	algoRecs: { popular: Set<string>; easiest: Set<string>; newest: Set<string> }
	countOfCardsDesired: number
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
			selectedAlgoRecs.indexOf(pid1) === -1 ?
				[...selectedAlgoRecs, pid1]
			:	selectedAlgoRecs.filter((pid2) => pid1 !== pid2)
		setSelectedAlgoRecs(updatedRecs)
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
						Recommended for you ({selectedAlgoRecs.length} of {countAllAlgoRecs}{' '}
						selected)
					</DrawerTitle>
				</DrawerHeader>
				<div className="grid gap-3 p-4 @lg:grid-cols-2">
					<DrawerDescription className="col-span-2">
						Review and select which recommended cards you want to include in
						your session
					</DrawerDescription>
					{Array.from(allAlgoRecsInOneSet).map((pid) => {
						const selected = selectedAlgoRecs.indexOf(pid) > -1
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
