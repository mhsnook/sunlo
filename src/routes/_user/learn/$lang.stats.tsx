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
	Construction,
	Contact,
	Logs,
	MessageCircleHeart,
	MessageSquarePlus,
	MessageSquareQuote,
	Rocket,
	Search,
} from 'lucide-react'
import languages from '@/lib/languages'
import { ago } from '@/lib/dayjs'
import { useDeckMeta, useDeckPids, useDeckRoutineStats } from '@/hooks/use-deck'
import { cn } from '@/lib/utils'
import Flagged from '@/components/flagged'
import { RecommendedPhrasesCard } from '@/routes/_user/learn/-recommended-phrases'
import { useLanguageMeta } from '@/hooks/use-language'
import { ActivityChart } from '@/components/activity-chart'
import { DeckStatsBadges } from '@/components/stats-badges'
import Callout from '@/components/ui/callout'
import { CSSProperties } from 'react'

export const Route = createFileRoute('/_user/learn/$lang/stats')({
	component: WelcomePage,
})

const style = { viewTransitionName: `main-area` } as CSSProperties

function WelcomePage() {
	const { lang } = Route.useParams()
	const { data: deck, isReady } = useDeckMeta(lang)
	if (isReady && !deck) throw new Error("Could not load this deck's data")
	if (!deck) return null
	const deckIsNew =
		deck.cards_active + deck.cards_skipped + deck.cards_learned === 0
	return (
		<main className="space-y-8" style={style}>
			{deckIsNew ?
				<Empty />
			:	<DeckOverview />}

			<RecommendedPhrasesCard lang={lang} />
			<DeckSettings />
		</main>
	)
}

function DeckOverview() {
	const { lang } = Route.useParams()
	const { data: meta } = useDeckMeta(lang)
	const { data: deckPids } = useDeckPids(lang)
	const { data: routineStats } = useDeckRoutineStats(lang)
	if (!meta || !deckPids || routineStats === undefined) {
		console.log(`oops, deck not found:`, meta, deckPids, routineStats)
		throw Error('This deck does not exist, sorry 🧄☹️🥦')
	}
	const totalToday =
		(deckPids.today_active.length ?? 0) + meta.daily_review_goal
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
					<DeckStatsBadges lang={lang} />
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2 text-sm">
				{meta.most_recent_review_at ?
					<p>
						Your last review was{' '}
						<span className="font-bold">{ago(meta.most_recent_review_at)}</span>
					</p>
				:	<p>You haven't done any reviews yet</p>}
				{routineStats ?
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
				:	null}
				<p>
					You have{' '}
					<span className="font-bold">{totalToday} cards to review today</span>:{' '}
					{deckPids.today_active.length} scheduled from prior reviews, along
					with {meta.daily_review_goal} new ones
				</p>

				<ActivityChart lang={lang} />
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
					<div className="grid w-full grid-cols-1 gap-2 @lg:grid-cols-2 @lg:gap-0">
						<Link
							to="/learn/$lang/add-phrase"
							from={Route.fullPath}
							className={cn(
								buttonVariants({ variant: 'secondary' }),
								'@lg:rounded-r-none'
							)}
						>
							<MessageSquareQuote />
							Add a phrase
						</Link>
						<Link
							to="/learn/$lang/requests/new"
							from={Route.fullPath}
							className={cn(
								buttonVariants({ variant: 'secondary' }),
								'@lg:rounded-l-none'
							)}
						>
							<MessageCircleHeart />
							Request a phrase
						</Link>
					</div>
					<Link
						to="/learn/$lang/feed"
						from={Route.fullPath}
						className={cn(
							buttonVariants({ variant: 'secondary' }),
							'grow basis-40'
						)}
					>
						<Logs />
						Browse the {languages[lang]} feed
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
						to="/learn/$lang/feed"
						from={Route.fullPath}
						className={buttonVariants({ variant: 'secondary' })}
					>
						<Logs /> Browse the {languages[lang]} feed
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
