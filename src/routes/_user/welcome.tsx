import { type CSSProperties, useMemo, useState } from 'react'
import {
	createFileRoute,
	Link,
	Navigate,
	useNavigate,
} from '@tanstack/react-router'
import { useLiveQuery } from '@tanstack/react-db'
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
	List,
} from 'lucide-react'

import { useProfile } from '@/features/profile/hooks'
import { useDecks } from '@/features/deck/hooks'
import { useAuth } from '@/lib/use-auth'
import { phraseRequestsCollection } from '@/features/requests/collections'
import { phraseRequestsActive } from '@/features/requests/live'
import { languagesCollection } from '@/features/languages/collections'
import { useLanguagesSortedByLearners } from '@/features/languages/hooks'
import languages, { allLanguageOptions } from '@/lib/languages'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { LangBadge } from '@/components/ui/badge'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { SelectOneLanguage } from '@/components/select-one-language'
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
		await Promise.all([
			phraseRequestsCollection.preload(),
			languagesCollection.preload(),
		])
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
	const [browseRequestsOpen, setBrowseRequestsOpen] = useState(false)

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
				<div className="from-2-mlo-primary to-0-lo-primary mx-auto flex size-20 items-center justify-center rounded-full bg-gradient-to-br">
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
					{hasDecks ? (
						<ActionCard
							icon={WalletCards}
							title="Continue Learning"
							description={`You have ${decks.length} deck${decks.length > 1 ? 's' : ''} ready to go.`}
							linkTo="/learn"
							linkText="Go to Decks"
							variant="primary"
						/>
					) : (
						<ActionCard
							icon={WalletCards}
							title="Create Your First Deck"
							description="Pick a language and start building your vocabulary."
							linkTo="/learn/add-deck"
							linkText="Start Learning"
							variant="primary"
							disabled={!isLearner && userRole !== 'both'}
						/>
					)}

					{/* Find Friends */}
					<ActionCard
						icon={UserPlus}
						title="Find Friends"
						description="Search for people you know or invite them to join."
						linkTo="/friends/chats"
						linkSearch={{ search: true }}
						linkText="Search Friends"
						variant="secondary"
					/>

					{/* Help Others */}
					<ActionCard
						icon={Heart}
						title="Help Others Learn"
						description="Answer translation requests in languages you know."
						linkText="Browse Requests"
						variant="secondary"
						onButtonClick={() => setBrowseRequestsOpen(true)}
					/>
					<BrowseRequestsDialog
						open={browseRequestsOpen}
						onOpenChange={setBrowseRequestsOpen}
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
						if (typeof lang === 'string')
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
				{hasDecks ? (
					<Link
						to={'/learn'}
						className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}
						data-testid="go-to-decks-link"
					>
						Go to My Decks
						<ArrowRight className="size-4" />
					</Link>
				) : isLearner ? (
					<Link
						to={'/learn/add-deck'}
						className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}
						data-testid="create-decks-button"
					>
						Create My First Deck
						<ArrowRight className="size-4" />
					</Link>
				) : (
					<Link
						to={'/friends/chats'}
						className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}
						data-testid="go-to-friends-link"
					>
						Find Friends
						<ArrowRight className="size-4" />
					</Link>
				)}

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
			<div className="bg-1-mlo-primary text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
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
	linkSearch,
	linkText,
	variant = 'secondary',
	disabled = false,
	onButtonClick,
}: {
	icon: typeof WalletCards
	title: string
	description: string
	linkTo?: string
	linkSearch?: Record<string, unknown>
	linkText: string
	variant?: 'primary' | 'secondary'
	disabled?: boolean
	onButtonClick?: () => void
}) {
	const isPrimary = variant === 'primary'

	return (
		<Card
			className={cn(
				'transition-shadow hover:shadow-md',
				isPrimary && 'border-4-mlo-primary bg-0-lo-primary'
			)}
		>
			<CardHeader className="pb-2">
				<div className="flex items-center gap-3">
					<div
						className={cn(
							'flex size-10 items-center justify-center rounded-full',
							isPrimary ? 'bg-primary text-primary-foreground' : 'bg-muted'
						)}
					>
						<Icon className="size-5" />
					</div>
					<CardTitle className="text-lg">{title}</CardTitle>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-muted-foreground text-sm">{description}</p>
				{disabled ? (
					<Button variant="soft" disabled className="w-full">
						{linkText}
					</Button>
				) : onButtonClick ? (
					<Button
						variant={isPrimary ? 'default' : 'soft'}
						className="w-full"
						onClick={onButtonClick}
					>
						{linkText}
					</Button>
				) : (
					<Link
						to={linkTo!}
						search={linkSearch}
						className={cn(
							buttonVariants({
								variant: isPrimary ? 'default' : 'soft',
							}),
							'w-full'
						)}
					>
						{linkText}
					</Link>
				)}
			</CardContent>
		</Card>
	)
}

function BrowseRequestsDialog({
	open,
	onOpenChange,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const navigate = useNavigate()
	const { data: allLanguages } = useLanguagesSortedByLearners()
	const [selectorLang, setSelectorLang] = useState('')
	const top5 = allLanguages?.slice(0, 5) ?? []

	const handleLang = (lang: string) => {
		onOpenChange(false)
		void navigate({ to: '/learn/$lang/requests', params: { lang } })
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Browse Requests</DialogTitle>
					<DialogDescription>
						Pick a language to see translation requests you can help answer.
					</DialogDescription>
				</DialogHeader>
				<div className="grid grid-cols-2 gap-3 @sm:grid-cols-3">
					{top5.map((lang) => (
						<button
							key={lang.lang}
							type="button"
							onClick={() => handleLang(lang.lang)}
							className="bg-card hover:bg-1-lo-primary flex flex-col gap-2 rounded-lg border p-4 text-start transition-colors"
						>
							<span className="from-5-mhi-primary to-6-mid-primary text-primary-foreground inline-flex w-fit items-center justify-center rounded-md bg-gradient-to-br px-2.5 py-1 font-mono text-sm font-semibold tracking-wider uppercase shadow-xs">
								{lang.lang.toUpperCase()}
							</span>
							<span className="text-sm leading-tight font-semibold">
								{lang.name}
							</span>
						</button>
					))}
					<SelectOneLanguage
						value={selectorLang}
						setValue={(lang) => {
							setSelectorLang(lang)
							if (lang) handleLang(lang)
						}}
						trigger={
							<button
								type="button"
								className="bg-card hover:bg-1-lo-primary flex flex-col gap-2 rounded-lg border border-dashed p-4 text-start transition-colors"
							>
								<span className="bg-muted text-muted-foreground inline-flex w-fit items-center justify-center rounded-md px-2.5 py-1">
									<List className="size-4" />
								</span>
								<span className="text-muted-foreground text-sm leading-tight font-semibold">
									More languages
								</span>
							</button>
						}
					/>
				</div>
			</DialogContent>
		</Dialog>
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
			.from({ req: phraseRequestsActive })
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
						className={buttonVariants({ variant: 'soft', size: 'sm' })}
					>
						See More Requests
					</Link>
				</div>
			)}
		</section>
	)
}
