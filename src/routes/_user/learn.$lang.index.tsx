import { createFileRoute, Link } from '@tanstack/react-router'

import { buttonVariants } from '@/components/ui/button-variants'
import type { FriendshipRow, LangOnlyComponentProps } from '@/types/main'
import { useProfile } from '@/lib/use-profile'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	BookCopy,
	Contact,
	Dumbbell,
	Library,
	NotebookPen,
	Search,
	Send,
} from 'lucide-react'
import languages from '@/lib/languages'
import { ago } from '@/lib/dayjs'
import { useDeck, useDeckMeta, useDeckPids } from '@/lib/use-deck'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import Flagged from '@/components/flagged'
import { RecommendedPhrasesCard } from '@/components/recommended-phrases'
import { useLanguage } from '@/lib/use-language'

export const Route = createFileRoute('/_user/learn/$lang/')({
	component: WelcomePage,
})

function WelcomePage() {
	const { lang } = Route.useParams()
	const { data: deck } = useDeck(lang)
	const { data: language } = useLanguage(lang)
	if (!language) throw new Error("Could not load this language's data")
	if (!deck) throw new Error("Could not load this deck's data")

	const deckIsNew = !(deck.pids.all.length > 0)
	return (
		<div className="space-y-8 px-2">
			{deckIsNew ?
				<Empty lang={lang} />
			:	<DeckOverview lang={lang} />}

			<RecommendedPhrasesCard lang={lang} />
			<Flagged name="friends_activity" className="hidden">
				<FriendsSection lang={lang} />
			</Flagged>
			<DeckSettings lang={lang} />
		</div>
	)
}

// TODO the database doesn't have friendships yet so this is all mockup-y
// and the type is also mocked
function FriendsSection({ lang }: LangOnlyComponentProps) {
	const profileQuery = useProfile()
	if (profileQuery.data === null) return null

	const friendsThisLanguage =
		profileQuery.data?.friendships?.filter(
			(f: FriendshipRow) => f.helping_with.indexOf(lang) !== -1
		) || []

	return (
		<Card>
			<CardHeader>
				<CardTitle>Your Friends</CardTitle>
				<CardDescription>
					NB: This "your friends" section is mock content for wireframe purposes
					only. The list below is not pulling from the database and doesn't
					reflect your actual friends list or their activities.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p>Recent activity in this deck</p>
				<ul className="mb-4 ml-4 list-disc">
					<li>somefriend (see recent activity or whatever)</li>
					<li>a-money (you have a new phrase from them)</li>
					<li>j-town (nothing special actually)</li>
				</ul>
				<div className="flex flex-row flex-wrap gap-2">
					<Link
						to="/friends/search"
						search={{ lang }}
						from={Route.fullPath}
						className={buttonVariants({ variant: 'secondary' })}
					>
						<Search /> Find friends on Sunlo
					</Link>
					<Link
						to="/friends/search"
						search={{ lang }}
						from={Route.fullPath}
						className={buttonVariants({ variant: 'secondary' })}
					>
						<Send /> Invite new friends
					</Link>
				</div>
			</CardContent>
		</Card>
	)
}

function DeckOverview({ lang }: LangOnlyComponentProps) {
	const { data: deckMeta } = useDeckMeta(lang)
	const { data: deckPids } = useDeckPids(lang)
	if (!deckMeta) throw Error('This deck does not exist, sorry 🧄☹️🥦')
	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<div className="flex flex-row items-center justify-between">
						<span>Deck Overview</span>
						<Link
							to="/learn/$lang/search"
							params={{ lang }}
							aria-disabled="true"
							className={buttonVariants({
								size: 'badge',
								variant: 'outline',
							})}
						>
							<Search className="size-3" />
							<span className="me-1">quick search</span>
						</Link>
					</div>
				</CardTitle>
				<CardDescription className="flex flex-row flex-wrap gap-2">
					<Badge variant="outline">
						{deckMeta.lang_total_phrases} phrases total
					</Badge>
					<Badge variant="outline">
						{deckMeta.cards_active} cards in your deck
					</Badge>
					<Badge variant="outline">
						{deckMeta.count_reviews_7d} reviews last 7d
					</Badge>
				</CardDescription>
			</CardHeader>
			<CardContent className="text-sm">
				<p>Your last review was {ago(deckMeta.most_recent_review_at)}</p>
				<Flagged name="routines_goals">
					<p>You've kept up with your routine 4 out of 5 days this week</p>
				</Flagged>
				<p>
					{deckPids?.today_active.length} active cards are scheduled for today,
					along with 15 new ones
				</p>
			</CardContent>
			<CardFooter>
				<div className="flex flex-row flex-wrap gap-2">
					<Link
						to="/learn/$lang/review"
						params={{ lang }}
						from={Route.fullPath}
						className={cn(
							buttonVariants({ variant: 'default' }),
							'grow basis-120'
						)}
					>
						<Dumbbell /> Review my {languages[lang]} flashcards
					</Link>
					<Link
						to="/learn/$lang/library"
						params={{ lang }}
						from={Route.fullPath}
						className={cn(
							buttonVariants({ variant: 'secondary' }),
							'grow basis-60'
						)}
					>
						<BookCopy />
						Browse the {languages[lang]} library
					</Link>
					<Link
						to="/learn/$lang/add-phrase"
						params={{ lang }}
						from={Route.fullPath}
						className={cn(
							buttonVariants({ variant: 'secondary' }),
							'grow basis-60'
						)}
					>
						<NotebookPen />
						Add a new phrase
					</Link>
				</div>
			</CardFooter>
		</Card>
	)
}

function DeckSettings({ lang }: LangOnlyComponentProps) {
	const { data } = useDeckMeta(lang)

	return (
		<Card>
			<CardHeader>
				<CardTitle>Deck Settings</CardTitle>
				<CardDescription>
					Set your deck preferences and learning mode, activate or de-activate.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<ul className="ms-4 list-disc">
					<li>
						Your deck is currently:{' '}
						<strong>{data?.archived ? 'Inactive' : 'Active'}</strong>
					</li>
					<li>
						Your learning motivation is:{' '}
						<strong>
							{data?.learning_goal === 'family' ?
								'To connect with family'
							: data?.learning_goal === 'visiting' ?
								'Preparing to visit'
							:	'Living in a new place'}
						</strong>
					</li>
					<Flagged name="learning_goals">
						<li>
							Your learning goals are: <strong>lorem upside downum</strong>
						</li>
					</Flagged>
				</ul>
				<Link
					to="/learn/$lang/deck-settings"
					params={{ lang }}
					from={Route.fullPath}
					className={buttonVariants({ variant: 'secondary' })}
				>
					Update Settings
				</Link>
			</CardContent>
		</Card>
	)
}

function Empty({ lang }: LangOnlyComponentProps) {
	return (
		<Card className="py-10">
			<CardHeader>
				<CardTitle>
					<h1 className="mb-6 text-3xl font-bold">
						Welcome to Your New Language Journey!
					</h1>
				</CardTitle>
				<CardContent className="space-y-6">
					<p className="text-lg">
						Let's get started by setting up your learning experience. Do you
						want to start by browsing the public deck of flash cards, or invite
						a friend to help you out?
					</p>
					<div className="flex flex-col gap-2 @lg:flex-row">
						<Link
							to="/learn/$lang/library"
							params={{ lang }}
							className={buttonVariants({ variant: 'secondary' })}
						>
							<Library /> Browse the {languages[lang]} library
						</Link>
						<Link
							to="/friends"
							className={buttonVariants({ variant: 'secondary' })}
						>
							<Contact /> Invite a friend
						</Link>
					</div>
					<p className="text-lg">
						Or, do you already have a phrase in mind you'd like to add?
					</p>
					<Link
						to="/learn/$lang/add-phrase"
						params={{ lang }}
						className={buttonVariants({ variant: 'secondary' })}
					>
						<NotebookPen /> Add a phrase
					</Link>
				</CardContent>
			</CardHeader>
		</Card>
	)
}
