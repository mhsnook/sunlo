import { type CSSProperties, useMemo } from 'react'
import {
	createFileRoute,
	Link,
	Navigate,
	useNavigate,
} from '@tanstack/react-router'
import { eq, useLiveQuery } from '@tanstack/react-db'
import {
	WalletCards,
	Users,
	MessageSquare,
	ListMusic,
	Camera,
	UserPlus,
	ArrowRight,
	Sparkles,
	Heart,
	Globe,
} from 'lucide-react'

import { useProfile } from '@/hooks/use-profile'
import { useDecks } from '@/hooks/use-deck'
import { useAuth } from '@/lib/use-auth'
import { phraseRequestsCollection } from '@/lib/collections'
import languages, { allLanguageOptions } from '@/lib/languages'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { LangBadge } from '@/components/ui/badge'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useIntro } from '@/hooks/use-intro-seen'
import { CommunityNormsIntro } from '@/components/intros'

export const Route = createFileRoute('/_user/welcome')({
	component: WelcomePage,
	beforeLoad: () => ({
		titleBar: {
			title: 'Welcome to Sunlo',
			subtitle: 'Learn languages with friends',
		},
	}),
	loader: async () => {
		await phraseRequestsCollection.preload()
	},
})

const style = { viewTransitionName: 'main-area' } as CSSProperties

function WelcomePage() {
	const navigate = useNavigate()
	const { data: profile, isLoading: profileLoading } = useProfile()
	const { data: decks } = useDecks()
	const { userRole } = useAuth()
	const { isOpen, needsAffirmation, handleAffirm } = useIntro(
		'community-norms',
		{
			requireAffirmation: true,
		}
	)

	// Redirect to getting-started if no profile
	if (!profileLoading && !profile) {
		return <Navigate to="/getting-started" />
	}

	const hasDecks = decks && decks.length > 0
	const isLearner = userRole === 'learner'

	return (
		<main style={style} className="space-y-8 pb-12" data-testid="welcome-page">
			{/* Community norms affirmation - required before using the app */}
			{needsAffirmation && (
				<CommunityNormsIntro open={isOpen} onAffirm={handleAffirm} />
			)}

			{/* Welcome Header */}
			<header className="space-y-4 text-center">
				<div className="from-primary/20 to-primary/5 mx-auto flex size-20 items-center justify-center rounded-full bg-gradient-to-br">
					<Sparkles className="text-primary size-10" />
				</div>
				<div>
					<h1 className="d1">
						Welcome, <em>{profile?.username}</em>!
					</h1>
					<p className="text-muted-foreground mt-2 text-lg text-balance">
						You&apos;re all set up and ready to start your language learning
						journey.
					</p>
				</div>
			</header>

			{/* What is Sunlo Section */}
			<section
				className="bg-card/50 rounded-lg border p-6"
				data-testid="sunlo-welcome-explainer"
			>
				<h2 className="mb-4 text-xl font-bold">What is Sunlo?</h2>
				<p className="text-muted-foreground mb-6">
					Sunlo is a social flashcard app that helps you learn languages through
					community-powered content. Here&apos;s how it works:
				</p>

				<div className="grid grid-cols-1 gap-4 @md:grid-cols-2">
					<FeatureItem
						icon={WalletCards}
						title="Flashcard Decks"
						description="Create decks for each language you're learning. Cards use spaced repetition to help you remember."
					/>
					<FeatureItem
						icon={Users}
						title="Social Learning"
						description="Connect with friends, share recommendations, and learn together."
					/>
					<FeatureItem
						icon={MessageSquare}
						title="Translation Requests"
						description="Ask the community how to say something, or help others by translating requests."
					/>
					<FeatureItem
						icon={ListMusic}
						title="Media Playlists"
						description="Learn from YouTube videos, songs, and other media with community-curated phrase lists."
					/>
				</div>
			</section>

			{/* Get Started Actions */}
			<section>
				<h2 className="mb-4 text-xl font-bold">Get Started</h2>
				<div className="grid grid-cols-1 gap-4 @lg:grid-cols-2">
					{/* Upload Profile Picture */}
					<ActionCard
						icon={Camera}
						title="Add a Profile Picture"
						description="Help friends recognize you by adding a photo."
						linkTo="/profile"
						linkText="Go to Profile"
						variant="secondary"
					/>

					{/* Start Learning or Continue */}
					{hasDecks ?
						<ActionCard
							icon={WalletCards}
							title="Continue Learning"
							description={`You have ${decks.length} deck${decks.length > 1 ? 's' : ''} ready to go.`}
							linkTo="/learn"
							linkText="Go to Decks"
							variant="primary"
						/>
					:	<ActionCard
							icon={WalletCards}
							title="Create Your First Deck"
							description="Pick a language and start building your vocabulary."
							linkTo="/learn/add-deck"
							linkText="Start Learning"
							variant="primary"
							disabled={!isLearner && userRole !== 'both'}
						/>
					}

					{/* Find Friends */}
					<ActionCard
						icon={UserPlus}
						title="Find Friends"
						description="Search for people you know or invite them to join."
						linkTo="/friends/search"
						linkText="Search Friends"
						variant="secondary"
					/>

					{/* Help Others */}
					<ActionCard
						icon={Heart}
						title="Help Others Learn"
						description="Answer translation requests in languages you know."
						linkTo="/learn/browse"
						linkText="Browse Requests"
						variant="secondary"
					/>
				</div>
			</section>

			{/* Explore a Language */}
			<section className="bg-card/50 flex flex-col items-center gap-4 rounded-lg border p-6 @md:flex-row @md:justify-between">
				<div>
					<h2 className="text-xl font-bold">Explore a Language</h2>
					<p className="text-muted-foreground">
						Browse phrases, playlists, and requests in any language
					</p>
				</div>
				<Select
					onValueChange={(lang) => {
						void navigate({ to: '/learn/$lang/feed', params: { lang } })
					}}
				>
					<SelectTrigger className="w-56">
						<SelectValue placeholder="Select a language" />
					</SelectTrigger>
					<SelectContent>
						{allLanguageOptions.map((lang) => (
							<SelectItem key={lang.value} value={lang.value}>
								{lang.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</section>

			{/* Requests in Languages You Know */}
			<RequestsYouCanHelp />

			{/* Continue Button */}
			<div className="flex flex-col items-center gap-4 pt-4">
				{hasDecks ?
					<Link
						to={'/learn'}
						className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}
						data-testid="go-to-decks-link"
					>
						Go to My Decks
						<ArrowRight className="size-4" />
					</Link>
				: isLearner ?
					<Link
						to={'/learn/add-deck'}
						className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}
						data-testid="create-decks-button"
					>
						Create My First Deck
						<ArrowRight className="size-4" />
					</Link>
				:	<Link
						to={'/friends'}
						className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}
						data-testid="go-to-friends-link"
					>
						Find Friends
						<ArrowRight className="size-4" />
					</Link>
				}

				<p className="text-muted-foreground text-sm">
					You can always come back to this page from your profile.
				</p>
			</div>
		</main>
	)
}

function FeatureItem({
	icon: Icon,
	title,
	description,
}: {
	icon: typeof WalletCards
	title: string
	description: string
}) {
	return (
		<div className="flex gap-3">
			<div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
				<Icon className="size-5" />
			</div>
			<div>
				<h3 className="font-semibold">{title}</h3>
				<p className="text-muted-foreground text-sm">{description}</p>
			</div>
		</div>
	)
}

function ActionCard({
	icon: Icon,
	title,
	description,
	linkTo,
	linkText,
	variant = 'secondary',
	disabled = false,
}: {
	icon: typeof WalletCards
	title: string
	description: string
	linkTo: string
	linkText: string
	variant?: 'primary' | 'secondary'
	disabled?: boolean
}) {
	const isPrimary = variant === 'primary'

	return (
		<Card
			className={cn(
				'transition-shadow hover:shadow-md',
				isPrimary && 'border-primary/50 bg-primary/5'
			)}
		>
			<CardHeader className="pb-2">
				<div className="flex items-center gap-3">
					<div
						className={cn(
							'flex size-10 items-center justify-center rounded-full',
							isPrimary ? 'bg-primary text-white' : 'bg-muted'
						)}
					>
						<Icon className="size-5" />
					</div>
					<CardTitle className="text-lg">{title}</CardTitle>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-muted-foreground text-sm">{description}</p>
				{disabled ?
					<Button variant="outline" disabled className="w-full">
						{linkText}
					</Button>
				:	<Link
						to={linkTo}
						className={cn(
							buttonVariants({
								variant: isPrimary ? 'default' : 'outline',
							}),
							'w-full'
						)}
					>
						{linkText}
					</Link>
				}
			</CardContent>
		</Card>
	)
}

function RequestsYouCanHelp() {
	const { data: profile } = useProfile()

	// Get the languages the user knows (excluding English as it's too common)
	const knownLangs = useMemo(() => {
		return (
			profile?.languages_known
				?.filter((l) => l.level === 'fluent' || l.level === 'proficient')
				?.map((l) => l.lang) ?? []
		)
	}, [profile?.languages_known])

	// Get requests in languages the user knows
	const { data: relevantRequests } = useLiveQuery((q) =>
		q
			.from({ req: phraseRequestsCollection })
			.where(({ req }) => eq(req.deleted, false))
			.orderBy(({ req }) => req.upvote_count, 'desc')
	)

	// Filter to requests in known languages
	const requestsToShow = useMemo(() => {
		if (!relevantRequests || knownLangs.length === 0) return []
		return relevantRequests
			.filter((req) => knownLangs.includes(req.lang))
			.slice(0, 4)
	}, [relevantRequests, knownLangs])

	if (requestsToShow.length === 0) {
		return null
	}

	return (
		<section>
			<div className="mb-4 flex items-center gap-2">
				<Globe className="text-primary size-5" />
				<h2 className="text-xl font-bold">Requests You Can Help With</h2>
			</div>
			<p className="text-muted-foreground mb-4">
				People are looking for translations in languages you know. Can you help?
			</p>

			<div className="grid grid-cols-1 gap-3 @lg:grid-cols-2">
				{requestsToShow.map((request) => (
					<Link
						key={request.id}
						to="/learn/$lang/requests/$id"
						params={{ lang: request.lang, id: request.id }}
						className="hover:bg-muted/50 flex items-start gap-3 rounded-lg border p-4 transition-colors"
					>
						<LangBadge lang={request.lang} />
						<div className="min-w-0 flex-1">
							<p className="line-clamp-2 font-medium">{request.prompt}</p>
							<p className="text-muted-foreground mt-1 text-sm">
								{languages[request.lang]} &middot; {request.upvote_count ?? 0}{' '}
								upvotes
							</p>
						</div>
					</Link>
				))}
			</div>

			{requestsToShow.length >= 4 && (
				<div className="mt-4 text-center">
					<Link
						to="/learn/browse"
						className={buttonVariants({ variant: 'outline', size: 'sm' })}
					>
						See More Requests
					</Link>
				</div>
			)}
		</section>
	)
}
