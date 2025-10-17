import { createFileRoute, Link } from '@tanstack/react-router'
import { buttonVariants } from '@/components/ui/button-variants'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	BookOpenText,
	Construction,
	Contact,
	Library,
	MessageSquarePlus,
	MessageSquareQuote,
	Rocket,
	Search,
} from 'lucide-react'
import languages from '@/lib/languages'
import { ago } from '@/lib/dayjs'
import {
	useDeckActivityChartData,
	useDeckMeta,
	useDeckPids,
	useDeckRoutineStats,
} from '@/hooks/use-deck'
import { cn } from '@/lib/utils'
import Flagged from '@/components/flagged'
import { RecommendedPhrasesCard } from '@/components/recommended-phrases'
import { useLanguageMeta } from '@/hooks/use-language'
import { ActivityChart } from '@/components/activity-chart'
import { DeckStatsBadges } from '@/components/stats-badges'
import Callout from '@/components/ui/callout'

export const Route = createFileRoute('/_user/learn/$lang/')({
	component: WelcomePage,
})

function WelcomePage() {
	const { lang } = Route.useParams()
	const { data: deck } = useDeckMeta(lang)
	if (!deck) throw new Error("Could not load this deck's data")

	const deckIsNew =
		deck.cards_active + deck.cards_skipped + deck.cards_learned === 0
	return (
		<div className="space-y-8">
			{deckIsNew ?
				<Empty />
			:	<DeckOverview />}

			<RecommendedPhrasesCard lang={lang} />
			<DeckSettings />
		</div>
	)
}

function DeckOverview() {
	const { lang } = Route.useParams()
	const { data: meta } = useDeckMeta(lang)
	const { data: pids } = useDeckPids(lang)
	const { data: routineStats } = useDeckRoutineStats(lang)
	const { data: activityChartData } = useDeckActivityChartData(lang)
	if (!meta || !pids || !routineStats || !activityChartData)
		throw Error('This deck does not exist, sorry 🧄☹️🥦')

	const totalToday =
		(meta.cardsScheduledForToday ?? 0) + (meta.daily_review_goal ?? 15)
	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<div className="flex flex-row items-center justify-between">
						<span>Deck Home</span>
						<Link
							to="/learn/$lang/search"
							from={Route.fullPath}
							aria-disabled="true"
							className={`${buttonVariants({
								variant: 'outline',
							})} -mt-2 aspect-square @max-lg:px-2`}
						>
							<Search className="size-3" />
							<span className="hidden @lg:block">Quick Search</span>
						</Link>
					</div>
				</CardTitle>
				<CardDescription className="flex flex-row flex-wrap gap-2">
					<DeckStatsBadges deckMeta={meta} />
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2 text-sm">
				<p>
					Your last review was{' '}
					<span className="font-bold">{ago(meta.most_recent_review_at)}</span>
				</p>
				<p>
					You've kept up with your routine
					<span className="font-bold">
						{(
							routineStats.daysMet === routineStats.daysSoFar &&
							routineStats.daysSoFar > 1
						) ?
							` all ${routineStats.daysSoFar} days this week!`
						:	` ${routineStats.daysMet} out of ${routineStats.daysSoFar} ${
								routineStats.daysSoFar === 1 ? 'day' : 'days'
							}`
						}
					</span>{' '}
					this week.
				</p>
				<p>
					You have{' '}
					<span className="font-bold">{totalToday} cards to review today</span>:{' '}
					{pids.today_active.length} scheduled from prior reviews, along with{' '}
					{meta.daily_review_goal ?? 15} new ones
				</p>

				{activityChartData.length > 0 && (
					<div className="my-4">
						<h4 className="text-muted-foreground mb-2 text-center font-semibold">
							Your Recent Reviews
						</h4>
						<ActivityChart data={activityChartData} />
					</div>
				)}
			</CardContent>
			<CardFooter>
				<div className="flex flex-row flex-wrap gap-2">
					<Link
						to="/learn/$lang/review"
						from={Route.fullPath}
						className={cn(
							buttonVariants({ variant: 'default', size: 'lg' }),
							'grow basis-120'
						)}
					>
						<Rocket /> Review my {languages[lang]} flashcards
					</Link>
					<Link
						to="/learn/$lang/library"
						from={Route.fullPath}
						className={cn(
							buttonVariants({ variant: 'secondary' }),
							'grow basis-40'
						)}
					>
						<BookOpenText />
						Browse the {languages[lang]} library
					</Link>
					<Link
						to="/learn/$lang/add-phrase"
						from={Route.fullPath}
						className={cn(
							buttonVariants({ variant: 'secondary' }),
							'grow basis-40'
						)}
					>
						<MessageSquarePlus />
						Add a new phrase
					</Link>
					<Link
						to="/learn/$lang/add-phrase"
						from={Route.fullPath}
						className={cn(
							buttonVariants({ variant: 'secondary' }),
							'grow basis-40'
						)}
					>
						<MessageSquareQuote />
						Request a phrase
					</Link>
				</div>
			</CardFooter>
		</Card>
	)
}

function DeckSettings() {
	const { lang } = Route.useParams()
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
						Your daily goal is{' '}
						<strong>{data?.daily_review_goal} new cards</strong>
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
					from={Route.fullPath}
					className={buttonVariants({ variant: 'secondary' })}
				>
					Update Settings
				</Link>
			</CardContent>
		</Card>
	)
}

const Icon = () => (
	<Construction className="bg-accent h-12 w-12 rounded-full border border-white p-2 text-white/80" />
)

function NewLang() {
	const { lang } = Route.useParams()

	return (
		<Callout Icon={Icon}>
			<div className="flex flex-col gap-2">
				<p className="h3 text-primary-foresoft font-bold">
					It looks like this is a brand new language!
				</p>
				<p>
					You are going to have to do a bit of extra prep. Here are some tips to
					get you started:
				</p>
				<ul className="ml-4 list-disc space-y-2">
					<li>
						Recruit a friend! Your best best in the world is a native-speaker
						whose face lights up with joy when they get to tell you something
						new about their culture.{' '}
						<Link from={Route.fullPath} className="s-link">
							Ask them to sign up and help you build your flashcard deck.
						</Link>
					</li>
					<li>
						Think of phrases you will find immediately useful, or a situation in
						the last 48 hours where you wanted to communicate something, but
						didn't know how. Then text a friend and ask them, and{' '}
						<Link
							from={Route.fullPath}
							to="/learn/$lang/add-phrase"
							className="s-link"
						>
							make a flash card out of their response
						</Link>
						.
					</li>
					<li>
						Or, if you have a good example you want to ask about,
						<Link
							from={Route.fullPath}
							to="/learn/$lang/requests/new"
							className="s-link"
						>
							make a Phrase Request share the link with your friends
						</Link>
						, so they can answer your request and help build the library for
						everyone else who comes after you wanting to learn {languages[lang]}
						.
					</li>
					{/*<li>?? join our discord community?? with other learners?? </li>*/}
				</ul>
			</div>
		</Callout>
	)
}

function Empty() {
	const { lang } = Route.useParams()

	const { data: languageMeta } = useLanguageMeta(lang)
	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<p className="text-3xl font-bold">Welcome to Your New Deck!</p>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				{!((languageMeta?.phrases_to_learn ?? 0) > 15) && <NewLang />}
				<p className="text-lg">
					Let's get started by setting up your learning experience. Do you want
					to start by browsing the public deck of flash cards, or invite a
					friend to help you out?
				</p>
				<div className="flex flex-col gap-4 @lg:flex-row">
					<Link
						to="/learn/$lang/library"
						from={Route.fullPath}
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
				<div className="flex gap-4">
					<Link
						to="/learn/$lang/add-phrase"
						from={Route.fullPath}
						className={buttonVariants({ variant: 'secondary' })}
					>
						<MessageSquarePlus /> Add a Phrase
					</Link>
					<Link
						to="/learn/$lang/requests/new"
						from={Route.fullPath}
						className={buttonVariants({ variant: 'secondary' })}
					>
						<MessageSquareQuote /> Request a Phrase
					</Link>
				</div>
			</CardContent>
		</Card>
	)
}
