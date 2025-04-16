import { createFileRoute, Link } from '@tanstack/react-router'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'

import type { ReviewableCard } from '@/types/main'
import languages from '@/lib/languages'
import { deckQueryOptions } from '@/lib/use-deck'
import { reviewablesQueryOptions } from '@/lib/use-reviewables'
import {
	BookOpen,
	CheckCircle,
	ChevronRight,
	Shuffle,
	Users,
	XCircle,
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

export const Route = createFileRoute('/_user/learn/$lang/review/')({
	component: ReviewPage,
	loader: async ({
		params: { lang },
		context: {
			queryClient,
			auth: { userId },
		},
	}) => {
		if (!userId) throw new Error('No userId present, for some reason')
		const promise1 = queryClient.fetchQuery(deckQueryOptions(lang, userId))
		const promise2 = queryClient.fetchQuery(
			reviewablesQueryOptions(lang, userId)
		)
		const data = {
			deck: await promise1,
			reviewables: (await promise2) as ReviewableCard[],
		}
		console.log(`preparing today's review`, data)
		return {
			reviewableCards: data.reviewables.map(
				(r) => data.deck.cardsMap[r.phrase_id!]
			),
		}
	},
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
	const { reviewableCards } = Route.useLoaderData()
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
				<div className="mb-8 grid gap-6 md:grid-cols-3">
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="flex items-center gap-2 text-xl">
								Total Cards
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="flex flex-row items-center justify-start gap-2 text-4xl font-bold text-orange-500">
								<BookOpen />
								{reviewStats.totalScheduled + reviewStats.totalNewCards}
							</p>
							<p className="text-muted-foreground">
								cards scheduled for review today
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-xl">New Cards</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="flex flex-row items-center justify-start gap-2 text-4xl font-bold text-green-500">
								<Shuffle />
								<span>{reviewStats.totalNewCards}</span>
							</p>
							<p className="text-muted-foreground">
								new cards will be introduced
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="flex items-center gap-2 text-xl">
								<Users className="h-5 w-5 text-purple-500" />
								Sources
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Friend recs:</span>
								<Badge variant="outline">{reviewStats.fromFriends}</Badge>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Public library:</span>
								<Badge variant="outline">{reviewStats.fromAlgo}</Badge>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Your deck:</span>
								<Badge variant="outline">{reviewStats.fromOwnDeck}</Badge>
							</div>
						</CardContent>
					</Card>
				</div>
				<div className="flex flex-col justify-center gap-4 @xl:flex-row">
					<Link
						to="/learn/$lang/review/go"
						params={{ lang }}
						className={buttonVariants({ size: 'lg' })}
					>
						Okay, let's get started <ChevronRight className="ml-2 h-5 w-5" />
					</Link>
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
							className={`border-1 ${card.selected ? 'border-primary bg-primary/10' : ''}`}
						>
							<CardHeader className="p-3 pb-0">
								<CardTitle className="text-base">{card.text}</CardTitle>
								<CardDescription>{card.translation.text}</CardDescription>
							</CardHeader>
							<CardFooter className="flex justify-end p-3 pt-0">
								<Button
									variant={card.selected ? 'default' : 'outline'}
									size="sm"
									className={
										card.selected ? 'bg-purple-600 hover:bg-purple-700' : ''
									}
								>
									{card.selected ?
										<>
											<CheckCircle className="mr-1 h-4 w-4" /> Selected
										</>
									:	<>
											<XCircle className="mr-1 h-4 w-4" /> Deselected
										</>
									}
								</Button>
							</CardFooter>
						</Card>
					))}
				</div>
			</div>
		</DrawerContent>
	)
}
