import { pids } from '@/types/main'
import {
	createFileRoute,
	Link,
	Navigate,
	useLoaderData,
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
	Users,
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
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { getFromLocalStorage } from '@/lib/use-reviewables'
import { todayString } from '@/lib/utils'

export const Route = createFileRoute('/_user/learn/$lang/review/')({
	component: ReviewPage,
})

const exampleRec = {
	pid: 'uuid-1',
	text: 'Vanakkam, eppadi irukkinga?',
	translation: { text: 'Hello, how are you?' },
	selected: true,
	source: 'friend',
}

const defaultRecs: Array<typeof exampleRec> = [] /*
	exampleRec,
	{
		pid: 'uuid-2',
		text: 'Enakku Tamil theriyum, aanal konjam mattum',
		translation: { text: 'I know Tamil, but only a little' },
		selected: true,
		source: 'algo',
	},
	{
		pid: 'uuid-3',
		text: 'Neenga romba azhaga irukkinga',
		translation: { text: 'You look very beautiful' },
		selected: true,
		source: 'friend',
	},
	{
		pid: 'uuid-4',
		text: 'Enakku Tamil saapadu romba pidikkum',
		translation: { text: 'I really like Tamil food' },
		selected: true,
		source: 'algo',
	},
	{
		pid: 'uuid-5',
		text: 'Naan Chennai-il vaazhndhirukiren',
		translation: { text: 'I have lived in Chennai' },
		selected: true,
		source: 'friend',
	},
	{
		pid: 'uuid-6',
		text: 'Indha pazham romba inippu',
		translation: { text: 'This fruit is very sweet' },
		selected: true,
		source: 'algo',
	},
	{
		pid: 'uuid-7',
		text: 'Naalai kaalaiyil sandhippom',
		translation: { text: 'We will meet tomorrow morning' },
		selected: true,
		source: 'friend',
	},
	{
		pid: 'uuid-8',
		text: 'Ungalukku enna venum?',
		translation: { text: 'What do you want?' },
		selected: true,
		source: 'algo',
	},
] */

function ReviewPage() {
	const { lang } = Route.useParams()
	const { queryClient } = Route.useRouteContext()
	const dayString = todayString()

	const reviewData = useMemo(() => {
		const dailyCacheKey = ['user', lang, 'review', dayString]
		return { dailyCacheKey, pids: getFromLocalStorage<pids>(dailyCacheKey) }
	}, [lang, dayString])

	const deckPids = useLoaderData({
		from: '/_user/learn/$lang',
		select: (data) => data.deck.pids,
	})

	// const [newCardsDesiredCount, setNewCardsDesiredCount] = useState<number>(15)
	const newCardsDesiredCount = 15

	// all recs for cards we've never reviewed (unreviewed cards are included)
	const [recs, setRecs] = useState(() =>
		defaultRecs.filter((r) => deckPids.reviewed.indexOf(r.pid) === -1)
	)
	const cardPidsRecommended: Record<
		'all' | 'fromFriends' | 'fromAlgo' | 'selected',
		pids
	> = {
		all: recs.map((r) => r.pid),
		fromFriends: recs
			.filter((r) => r.source === 'friend' && r.selected === true)
			.map((r) => r.pid),
		fromAlgo: recs
			.filter((r) => r.source === 'algo' && r.selected === true)
			.map((r) => r.pid),
		selected: recs.filter((r) => r.selected === true).map((r) => r.pid),
	}

	// don't let it be a negative number
	const cardCountDesiredAfterRecs = Math.max(
		0,
		newCardsDesiredCount - cardPidsRecommended.selected.length
	)
	// will be 0 if there are enough recs to fill today's quota

	// unreviewed cards that aren't already in the recs
	const cardPidsAvailabileInDeck = deckPids.unreviewed.filter(
		(p) => cardPidsRecommended.all.indexOf(p) === -1
	)

	const cardPidsPickedFromDeck = cardPidsAvailabileInDeck.slice(
		0,
		cardCountDesiredAfterRecs
	)
	const cardPidsAllNewToday = [
		...cardPidsRecommended.selected,
		...cardPidsPickedFromDeck,
	]
	const cardPidsAllToday = [...cardPidsAllNewToday, ...deckPids.today]
	const noCards = cardPidsAllToday.length === 0

	const navigate = useNavigate({ from: Route.fullPath })
	const { mutate, isPending } = useMutation({
		mutationKey: [...reviewData.dailyCacheKey, 'create'],
		mutationFn: async () => {
			localStorage.setItem(
				JSON.stringify(reviewData.dailyCacheKey),
				JSON.stringify(cardPidsAllToday)
			)
			return { total: cardPidsAllToday.length, new: cardPidsAllNewToday.length }
			/* const { data } = await supabase
				.from('user_card')
				.insert(
					recPids.selected.map((pid) => ({
						phrase_id: pid,
						user_deck_id: meta.id!,
					}))
				)
				.select()
				.throwOnError()
			return data */
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

	return (
		<Card>
			<CardHeader>
				<CardTitle>Get Ready to review your {languages[lang]} cards</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-muted-foreground max-w-2xl text-lg">
					Your personalized review session is prepared and waiting for you.
					Here's what to expect:
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
								{cardPidsAllToday.length}
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
								<span>{cardPidsAllNewToday.length}</span>
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
								<span>{cardPidsRecommended.selected.length}</span>
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
											{cardPidsRecommended.fromFriends.length}
										</Badge>
									</div>
								</Flagged>
								<Flagged name="smart_recommendations">
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">Sunlo's recs:</span>
										<Badge variant="outline">
											{cardPidsRecommended.fromAlgo.length}
										</Badge>
									</div>
								</Flagged>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">From your deck:</span>
									<Badge variant="outline">
										{cardPidsPickedFromDeck.length}
									</Badge>
								</div>
								<Flagged name="smart_recommendations">
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">
											Public library:
										</span>
										<Badge variant="outline">0</Badge>
									</div>
								</Flagged>
							</CardContent>
						</Card>
					</Flagged>
				</div>
				{!(newCardsDesiredCount > cardPidsAllNewToday.length) ? null : (
					<NotEnoughCards
						lang={lang}
						newCardsDesiredCount={newCardsDesiredCount}
						newCardsCount={cardPidsAllNewToday.length}
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
						disabled={isPending || cardPidsAllNewToday.length === 0}
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
								recs={recs}
								setRecs={setRecs}
								recPids={cardPidsRecommended}
							/>
						</Drawer>
					</Flagged>
				</div>
			</CardContent>
		</Card>
	)
}

function ReviewCardsToAddToDeck({
	recs,
	setRecs,
	recPids,
}: {
	recs: typeof defaultRecs
	setRecs: (recs: typeof defaultRecs) => void
	recPids: any
}) {
	// Toggle card selection
	const toggleCardSelection = (pid: string) => {
		const updatedCards = recs.map((card) =>
			card.pid === pid ? { ...card, selected: !card.selected } : card
		)
		setRecs(updatedCards)
	}
	return (
		<DrawerContent>
			<div className="mx-auto w-full max-w-prose">
				<DrawerHeader>
					<DrawerTitle className="flex items-center gap-2 text-xl">
						<Users className="h-5 w-5 text-purple-500" />
						Recommended for you ({recPids.fromFriends.length} of{' '}
						{recs.filter((r) => r.source === 'friends')} selected)
					</DrawerTitle>
					<DrawerDescription>
						Review and select which recommended cards you want to include in
						your session
					</DrawerDescription>
				</DrawerHeader>
				<div className="grid gap-3 p-4 @lg:grid-cols-2">
					{recs.map((card) => (
						<Card
							onClick={() => toggleCardSelection(card.pid)}
							key={card.pid}
							className={`hover:bg-primary/20 cursor-pointer border-1 transition-all ${card.selected ? 'border-primary bg-primary/10' : ''}`}
						>
							<CardHeader className="p-3 pb-0">
								<CardTitle className="text-base">{card.text}</CardTitle>
								<CardDescription>{card.translation.text}</CardDescription>
							</CardHeader>
							<CardFooter className="flex justify-end p-3 pt-0">
								<Badge
									variant={card.selected ? 'default' : 'outline'}
									className="grid grid-cols-1 grid-rows-1 place-items-center font-normal [grid-template-areas:'stack']"
								>
									<span
										className={`flex flex-row items-center gap-1 [grid-area:stack] ${card.selected ? '' : 'invisible'}`}
									>
										<CheckCircle className="mr-1 h-3 w-3" /> Selected
									</span>
									<span
										className={`[grid-area:stack] ${card.selected ? 'invisible' : ''}`}
									>
										Tap to select
									</span>
								</Badge>
							</CardFooter>
						</Card>
					))}
				</div>
			</div>
		</DrawerContent>
	)
}

function NotEnoughCards({
	lang,
	newCardsDesiredCount,
	newCardsCount,
}: {
	lang: string
	newCardsDesiredCount: number
	newCardsCount: number
}) {
	const isEmpty = newCardsCount === 0
	return (
		<Callout variant="ghost" Icon={() => <MessageCircleWarningIcon />}>
			<p>
				It looks like you don't have {isEmpty ? 'any' : 'enough'} new cards{' '}
				{isEmpty ?
					"to review. You'll have to add at least a few before you can proceed"
				:	<>
						in your deck to meet your goal of{' '}
						<strong className="italic">
							{newCardsDesiredCount} new cards a day
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
			{isEmpty ? null : (
				<>
					Or click the big button below and get started with the {newCardsCount}{' '}
					cards you have.
				</>
			)}
		</Callout>
	)
}
