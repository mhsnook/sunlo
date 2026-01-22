import { createFileRoute, Link } from '@tanstack/react-router'
import { buttonVariants } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	Contact,
	Logs,
	MessageCircleHeart,
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
import { ActivityChart } from '@/components/activity-chart'
import { DeckStatsBadges } from '@/components/stats-badges'
import { CSSProperties } from 'react'
import {
	useDeckNewIntro,
	DeckNewIntro,
	DeckNewCallout,
} from '@/components/intros'

export const Route = createFileRoute('/_user/learn/$lang/stats')({
	component: WelcomePage,
})

const style = { viewTransitionName: `main-area` } as CSSProperties

function WelcomePage() {
	const { lang } = Route.useParams()
	const { data: deck, isReady } = useDeckMeta(lang)
	const { isOpen, showCallout, handleClose, handleReopen } = useDeckNewIntro()

	if (isReady && !deck) throw new Error("Could not load this deck's data")
	if (!deck) return null

	const deckIsNew =
		deck.cards_active + deck.cards_skipped + deck.cards_learned === 0

	return (
		<main className="space-y-8" style={style}>
			{/* Show intro dialog for first-time visitors with new deck */}
			{deckIsNew && <DeckNewIntro open={isOpen} onClose={handleClose} />}

			{/* Show small callout for returning users with new/growing language */}
			{deckIsNew && showCallout && <DeckNewCallout onShowMore={handleReopen} />}

			{/* Always show the deck overview now, even for new decks */}
			<DeckOverview deckIsNew={deckIsNew} />

			<RecommendedPhrasesCard lang={lang} />
			<DeckSettings />
		</main>
	)
}

function DeckOverview({ deckIsNew = false }: { deckIsNew?: boolean }) {
	const { lang } = Route.useParams()
	const { data: meta } = useDeckMeta(lang)
	const { data: deckPids } = useDeckPids(lang)
	const { data: routineStats } = useDeckRoutineStats(lang)
	if (!meta || !deckPids || routineStats === undefined) {
		console.log(`oops, deck not found:`, meta, deckPids, routineStats)
		throw Error('This deck does not exist, sorry')
	}
	const totalToday =
		(deckPids.today_active.length ?? 0) + meta.daily_review_goal
	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<div className="flex flex-row items-center justify-between">
						<span>
							{deckIsNew ? `Your ${languages[lang]} Deck` : 'Deck Home'}
						</span>
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
				{deckIsNew ?
					<p className="text-base">
						Let's get started! Browse the feed to find phrases, or add your own.
					</p>
				: meta.most_recent_review_at ?
					<p>
						Your last review was{' '}
						<span className="font-bold">{ago(meta.most_recent_review_at)}</span>
					</p>
				:	<p>You haven't done any reviews yet</p>}
				{!deckIsNew && routineStats ?
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
				{!deckIsNew && (
					<p>
						You have{' '}
						<span className="font-bold">
							{totalToday} cards to review today
						</span>
						: {deckPids.today_active.length} scheduled from prior reviews, along
						with {meta.daily_review_goal} new ones
					</p>
				)}

				{!deckIsNew && <ActivityChart lang={lang} />}
			</CardContent>
			<CardFooter>
				<div className="flex flex-row flex-wrap gap-2">
					{deckIsNew ?
						<Link
							to="/learn/$lang/feed"
							from={Route.fullPath}
							className={cn(
								buttonVariants({ variant: 'default', size: 'lg' }),
								'grow basis-120'
							)}
						>
							<Logs /> Browse the {languages[lang]} feed
						</Link>
					:	<Link
							to="/learn/$lang/review"
							from={Route.fullPath}
							className={cn(
								buttonVariants({ variant: 'default', size: 'lg' }),
								'grow basis-120'
							)}
						>
							<Rocket /> Review my {languages[lang]} flashcards
						</Link>
					}
					<div className="grid w-full grid-cols-1 gap-2 @lg:grid-cols-2 @lg:gap-0">
						<Link
							to="/learn/$lang/phrases/new"
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
					{deckIsNew ?
						<Link
							to="/friends"
							className={cn(
								buttonVariants({ variant: 'secondary' }),
								'grow basis-40'
							)}
						>
							<Contact />
							Invite a friend
						</Link>
					:	<Link
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
					}
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
