import { createFileRoute, Link, useLoaderData } from '@tanstack/react-router'
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
	MessageSquare,
	MessageSquarePlus,
	Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { useState } from 'react'
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '@/components/ui/drawer'
import Flagged from '@/components/flagged'

export const Route = createFileRoute('/_user/learn/$lang/review/')({
	component: ReviewPage,
})

const defaultRecs = [
	{
		pid: 1,
		text: 'Vanakkam, eppadi irukkinga?',
		translation: { text: 'Hello, how are you?' },
		selected: true,
		source: 'friend',
	},
	{
		pid: 2,
		text: 'Enakku Tamil theriyum, aanal konjam mattum',
		translation: { text: 'I know Tamil, but only a little' },
		selected: true,
		source: 'algo',
	},
	{
		pid: 3,
		text: 'Neenga romba azhaga irukkinga',
		translation: { text: 'You look very beautiful' },
		selected: true,
		source: 'friend',
	},
	{
		pid: 4,
		text: 'Enakku Tamil saapadu romba pidikkum',
		translation: { text: 'I really like Tamil food' },
		selected: true,
		source: 'algo',
	},
	{
		pid: 5,
		text: 'Naan Chennai-il vaazhndhirukiren',
		translation: { text: 'I have lived in Chennai' },
		selected: true,
		source: 'friend',
	},
	{
		pid: 6,
		text: 'Indha pazham romba inippu',
		translation: { text: 'This fruit is very sweet' },
		selected: true,
		source: 'algo',
	},
	{
		pid: 7,
		text: 'Naalai kaalaiyil sandhippom',
		translation: { text: 'We will meet tomorrow morning' },
		selected: true,
		source: 'friend',
	},
	{
		pid: 8,
		text: 'Ungalukku enna venum?',
		translation: { text: 'What do you want?' },
		selected: true,
		source: 'algo',
	},
]

function ReviewPage() {
	const { lang } = Route.useParams()
	const { reviewableCards } = useLoaderData({ from: '/_user/learn/$lang' })
	const [recs, setRecs] = useState(defaultRecs)
	const [newCardsDesiredCount, setNewCardsDesiredCount] = useState<number>(15)
	const recStats = {
		fromFriends: recs.filter(
			(r) => r.source === 'friend' && r.selected === true
		).length,
		fromAlgo: recs.filter((r) => r.source === 'algo' && r.selected === true)
			.length,
	}

	const reviewStats = {
		previouslyReviewed: reviewableCards.length,
		totalScheduled:
			reviewableCards?.length +
			Math.max(newCardsDesiredCount, recStats.fromFriends + recStats.fromAlgo),
		totalNewCards: newCardsDesiredCount,
		...recStats,
		fromOwnDeck: Math.max(
			newCardsDesiredCount - recStats.fromFriends - recStats.fromAlgo,
			0
		),
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Get Ready to review your {languages[lang]} cards</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-muted-foreground mb-4 max-w-2xl text-lg">
					Your personalized review session is prepared and waiting for you.
					Here's what to expect:
				</p>
				<div className="mb-8 flex flex-row flex-wrap gap-6 text-sm">
					<Card className="grow basis-40">
						<CardHeader className="pb-2">
							<CardTitle className="flex items-center gap-2 text-xl">
								Total Cards
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="flex flex-row items-center justify-start gap-2 text-4xl font-bold text-orange-500">
								<BookOpen />
								{reviewStats.totalScheduled}
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
								<span>{reviewStats.totalNewCards}</span>
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
								<span>{reviewStats.previouslyReviewed}</span>
							</p>
							<p className="text-muted-foreground">
								scheduled based on past reviews
							</p>
						</CardContent>
					</Card>
					<Flagged name="smart_recommendations">
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
										<Badge variant="outline">{reviewStats.fromFriends}</Badge>
									</div>
								</Flagged>
								<Flagged name="smart_recommendations">
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">Sunlo's recs:</span>
										<Badge variant="outline">{reviewStats.fromAlgo}</Badge>
									</div>
								</Flagged>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">From your deck:</span>
									<Badge variant="outline">{reviewStats.fromOwnDeck}</Badge>
								</div>
								<Flagged name="smart_recommendations">
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">
											Public library:
										</span>
										<Badge variant="outline">
											{reviewStats.totalNewCards -
												reviewStats.fromAlgo -
												reviewStats.fromFriends -
												reviewStats.fromOwnDeck}
										</Badge>
									</div>
								</Flagged>
							</CardContent>
						</Card>
					</Flagged>
				</div>
				<div className="flex flex-col justify-center gap-4 @xl:flex-row">
					<Link
						to="/learn/$lang/review/go"
						params={{ lang }}
						className={buttonVariants({ size: 'lg' })}
					>
						Okay, let's get started <ChevronRight className="ml-2 h-5 w-5" />
					</Link>
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
								reviewStats={reviewStats}
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
	reviewStats,
}: {
	recs: typeof defaultRecs
	setRecs: (recs: typeof defaultRecs) => void
	reviewStats: any
}) {
	// Toggle card selection
	const toggleCardSelection = (pid: number) => {
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
						Recommended for you ({reviewStats.fromFriends} of{' '}
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
