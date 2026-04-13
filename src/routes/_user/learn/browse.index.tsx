import { type CSSProperties } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useLiveQuery } from '@tanstack/react-db'
import {
	Globe,
	Users,
	WalletCards,
	TrendingUp,
	MessageSquare,
	Star,
	LayoutGrid,
	List,
	ExternalLink,
	Search,
	LogIn,
	UserPlus,
} from 'lucide-react'

import {
	useAllLanguages,
	useLanguagesSortedByLearners,
} from '@/features/languages/hooks'
import { phrasesCollection } from '@/features/phrases/collections'
import { phraseRequestsCollection } from '@/features/requests/collections'
import { phraseRequestsActive } from '@/features/requests/live'
import { playlistPhraseLinksCollection } from '@/features/playlists/collections'
import { phrasePlaylistsActive } from '@/features/playlists/live'
import { useAuth } from '@/lib/use-auth'
import languages, { allLanguageOptions } from '@/lib/languages'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { buttonVariants } from '@/components/ui/button'
import { LangBadge, Badge } from '@/components/ui/badge'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import Flagged from '@/components/flagged'

export const Route = createFileRoute('/_user/learn/browse/')({
	component: BrowsePage,
})

const style = { viewTransitionName: 'main-area' } as CSSProperties

function BrowsePage() {
	const { isAuth } = useAuth()
	const navigate = useNavigate({ from: Route.fullPath })

	return (
		<main style={style} className="space-y-8 pb-12" data-testid="browse-page">
			{/* Search Trigger */}
			<button
				type="button"
				onClick={() =>
					void navigate({
						search: (prev) => ({ ...prev, search: true }),
						replace: true,
					})
				}
				className="border-3-mlo-primary hover:border-primary bg-card/50 flex h-12 w-full items-center gap-3 rounded-2xl border px-4 transition-colors"
				data-testid="browse-search-trigger"
			>
				<Search className="text-muted-foreground size-5" />
				<span className="text-muted-foreground flex-1 text-start text-base">
					Search...
				</span>
				<kbd className="bg-muted text-muted-foreground rounded-lg border px-2 py-0.5 text-xs">
					Ctrl+K
				</kbd>
			</button>

			{/* Go to language feed dropdown + auth buttons */}
			<div className="flex flex-row items-center justify-around gap-4 @xl:justify-between">
				<div className="flex flex-col items-center gap-3 @xl:flex-row">
					<span className="text-muted-foreground">Go to feed:</span>
					<Select
						onValueChange={(lang) => {
							if (typeof lang === 'string')
								void navigate({ to: '/learn/$lang/feed', params: { lang } })
						}}
					>
						<SelectTrigger className="w-56 border">
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
				</div>
				{!isAuth && (
					<div className="flex flex-col items-stretch gap-2 @xl:flex-row @xl:items-center">
						<Link to="/login" className={buttonVariants({ variant: 'soft' })}>
							<LogIn /> Sign In
						</Link>
						<Link to="/signup" className={buttonVariants()}>
							<UserPlus />
							Get Started
						</Link>
					</div>
				)}
			</div>

			{/* Stats Section */}
			<StatsSection />

			{/* Most Active Languages */}
			<LanguagesSection />

			{/* Popular Requests */}
			<PopularRequestsSection />

			{/* Trending Playlists */}
			<TrendingPlaylistsSection />

			{/* CTA Section */}
			{!isAuth && <CTASection />}
		</main>
	)
}

function StatsSection() {
	const { data: allLanguages } = useAllLanguages()
	const { data: allPhrases } = useLiveQuery((q) =>
		q.from({ phrase: phrasesCollection })
	)

	const languageCount = allLanguages?.length ?? 0
	const totalLearners =
		allLanguages?.reduce((sum, l) => sum + (l.learners ?? 0), 0) ?? 0
	const totalPhrases = allPhrases?.length ?? 0

	const stats = [
		{
			icon: Globe,
			value: languageCount,
			label: 'Languages Available',
		},
		{
			icon: Users,
			value:
				totalLearners > 1000 ?
					`${(totalLearners / 1000).toFixed(1)}K+`
				:	totalLearners,
			label: 'Active Learners',
		},
		{
			icon: WalletCards,
			value:
				totalPhrases > 1000000 ? `${(totalPhrases / 1000000).toFixed(1)}M+`
				: totalPhrases > 1000 ? `${(totalPhrases / 1000).toFixed(1)}K+`
				: totalPhrases,
			label: 'Flashcards Created',
		},
	]

	return (
		<div className="grid grid-cols-1 gap-4 @md:grid-cols-3">
			{stats.map((stat) => (
				<Card key={stat.label} className="bg-card/30">
					<CardContent className="flex flex-row items-center gap-4 p-6">
						<div className="bg-1-mlo-primary text-primary rounded-full p-3">
							<stat.icon className="size-6" />
						</div>
						<div>
							<p className="text-2xl font-bold">{stat.value}</p>
							<p className="text-muted-foreground text-sm">{stat.label}</p>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	)
}

function LanguagesSection() {
	const { data: allLanguages } = useLanguagesSortedByLearners()

	const { data: requestCounts } = useLiveQuery((q) =>
		q.from({ req: phraseRequestsCollection })
	)

	const { data: phraseCounts } = useLiveQuery((q) =>
		q.from({ phrase: phrasesCollection })
	)

	// Calculate request and phrase counts per language
	const requestsByLang =
		requestCounts?.reduce(
			(acc, req) => {
				acc[req.lang] = (acc[req.lang] ?? 0) + 1
				return acc
			},
			{} as Record<string, number>
		) ?? {}

	const phrasesByLang =
		phraseCounts?.reduce(
			(acc, phrase) => {
				acc[phrase.lang] = (acc[phrase.lang] ?? 0) + 1
				return acc
			},
			{} as Record<string, number>
		) ?? {}

	const topLanguages = allLanguages?.slice(0, 6) ?? []

	return (
		<section>
			<Tabs defaultValue="grid">
				<div className="mb-4 flex flex-row items-start justify-between">
					<div>
						<h2 className="text-2xl font-bold">Most Active Languages</h2>
						<p className="text-muted-foreground">
							Start learning with our most popular language communities
						</p>
					</div>
					<TabsList>
						<TabsTrigger value="grid">
							<LayoutGrid className="size-4" />
							<span className="sr-only">Grid View</span>
						</TabsTrigger>
						<TabsTrigger value="list">
							<List className="size-4" />
							<span className="sr-only">List View</span>
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value="grid">
					<div
						className="grid grid-cols-1 gap-4 @md:grid-cols-2 @xl:grid-cols-3"
						data-testid="language-card-list"
					>
						{topLanguages.map((lang) => (
							<LanguageCard
								key={lang.lang}
								lang={lang.lang}
								name={lang.name}
								learners={lang.learners ?? 0}
								requests={requestsByLang[lang.lang] ?? 0}
								phrases={phrasesByLang[lang.lang] ?? 0}
							/>
						))}
					</div>
				</TabsContent>
				<TabsContent value="list">
					<div
						className="divide-y rounded-lg border"
						data-testid="language-card-list"
					>
						{topLanguages.map((lang) => (
							<LanguageListItem
								key={lang.lang}
								lang={lang.lang}
								name={lang.name}
								learners={lang.learners ?? 0}
								requests={requestsByLang[lang.lang] ?? 0}
								phrases={phrasesByLang[lang.lang] ?? 0}
							/>
						))}
					</div>
				</TabsContent>
			</Tabs>
		</section>
	)
}

function LanguageCard({
	lang,
	name,
	learners,
	requests,
	phrases,
}: {
	lang: string
	name: string
	learners: number
	requests: number
	phrases: number
}) {
	return (
		<Card data-key={lang}>
			<CardHeader className="pb-2">
				<div className="flex items-center gap-3">
					<LangBadge lang={lang} />
					<div>
						<h3 className="font-semibold">{name}</h3>
						<span className="text-muted-foreground flex items-center gap-1 text-xs">
							<TrendingUp className="size-3" />
							Active
						</span>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-2 pb-4">
				<div className="text-muted-foreground flex items-center justify-between text-sm">
					<span className="flex items-center gap-2">
						<Users className="size-4" /> Learners
					</span>
					<span className="text-foreground font-medium">
						{learners.toLocaleString()}
					</span>
				</div>
				<div className="text-muted-foreground flex items-center justify-between text-sm">
					<span className="flex items-center gap-2">
						<MessageSquare className="size-4" /> Requests
					</span>
					<span className="text-foreground font-medium">
						{requests.toLocaleString()}
					</span>
				</div>
				<div className="text-muted-foreground flex items-center justify-between text-sm">
					<span className="flex items-center gap-2">
						<WalletCards className="size-4" /> Flashcards
					</span>
					<span className="text-foreground font-medium">
						{phrases.toLocaleString()}
					</span>
				</div>
			</CardContent>
			<CardFooter className="pt-0">
				<Link
					to="/learn/$lang/feed"
					params={{ lang }}
					className={cn(buttonVariants({ variant: 'soft' }), 'w-full')}
					data-testid="explore-language-link"
				>
					Explore {languages[lang] ?? name}
				</Link>
			</CardFooter>
		</Card>
	)
}

function LanguageListItem({
	lang,
	name,
	learners,
	requests,
	phrases,
}: {
	lang: string
	name: string
	learners: number
	requests: number
	phrases: number
}) {
	return (
		<div
			className="flex flex-row items-center justify-between gap-4 p-4"
			data-key={lang}
		>
			<div className="flex items-center gap-3">
				<LangBadge lang={lang} />
				<span className="font-medium">{name}</span>
			</div>
			<div className="flex items-center gap-6">
				<span className="text-muted-foreground text-sm">
					{learners.toLocaleString()} learners
				</span>
				<span className="text-muted-foreground text-sm">
					{requests.toLocaleString()} requests
				</span>
				<span className="text-muted-foreground text-sm">
					{phrases.toLocaleString()} phrases
				</span>
				<Link
					to="/learn/$lang/feed"
					params={{ lang }}
					className={buttonVariants({ variant: 'soft', size: 'sm' })}
				>
					Explore
				</Link>
			</div>
		</div>
	)
}

function PopularRequestsSection() {
	const { data: popularRequests } = useLiveQuery((q) =>
		q
			.from({ req: phraseRequestsActive })
			.orderBy(({ req }) => req.upvote_count, 'desc')
	)

	const topRequests = popularRequests?.slice(0, 6) ?? []

	return (
		<section>
			<div className="mb-4">
				<h2 className="text-2xl font-bold">Popular Requests</h2>
				<p className="text-muted-foreground">
					See what our community is learning right now
				</p>
			</div>

			<div className="grid grid-cols-1 gap-4 @lg:grid-cols-2">
				{topRequests.map((request) => (
					<RequestCard key={request.id} request={request} />
				))}
			</div>
		</section>
	)
}

function RequestCard({
	request,
}: {
	request: { id: string; lang: string; prompt: string; upvote_count: number }
}) {
	return (
		<Card className="transition-shadow hover:shadow-md">
			<CardHeader className="pb-2">
				<div className="flex items-center gap-2">
					<LangBadge lang={request.lang} />
					<Flagged>
						<span className="text-muted-foreground flex items-center gap-1 text-sm">
							<Star className="size-3 fill-current" />
							{((request.upvote_count ?? 0) / 10 + 4).toFixed(1)}
						</span>
					</Flagged>
				</div>
			</CardHeader>
			<CardContent className="pb-4">
				<p className="line-clamp-2 font-medium">{request.prompt}</p>
				<p className="text-muted-foreground mt-1 text-sm">
					{languages[request.lang] ?? request.lang}
				</p>
			</CardContent>
			<CardFooter className="flex items-center justify-between pt-0">
				<span className="text-muted-foreground text-sm">
					{request.upvote_count ?? 0} upvotes
				</span>
				<Link
					to="/learn/$lang/requests/$id"
					params={{ lang: request.lang, id: request.id }}
					className={buttonVariants({ variant: 'soft', size: 'sm' })}
				>
					View Details
				</Link>
			</CardFooter>
		</Card>
	)
}

function TrendingPlaylistsSection() {
	const { data: playlists } = useLiveQuery((q) =>
		q
			.from({ playlist: phrasePlaylistsActive })
			.orderBy(({ playlist }) => playlist.upvote_count, 'desc')
	)

	const { data: playlistLinks } = useLiveQuery((q) =>
		q.from({ link: playlistPhraseLinksCollection })
	)

	// Count phrases per playlist
	const phrasesPerPlaylist =
		playlistLinks?.reduce(
			(acc, link) => {
				acc[link.playlist_id] = (acc[link.playlist_id] ?? 0) + 1
				return acc
			},
			{} as Record<string, number>
		) ?? {}

	const topPlaylists = playlists?.slice(0, 6) ?? []

	return (
		<section>
			<div className="mb-4">
				<h2 className="text-2xl font-bold">Trending Playlists</h2>
				<p className="text-muted-foreground">
					Curated flashcard sets from YouTube videos and other media
				</p>
			</div>

			<div className="grid grid-cols-1 gap-4 @md:grid-cols-2 @xl:grid-cols-3">
				{topPlaylists.map((playlist) => (
					<PlaylistCard
						key={playlist.id}
						playlist={playlist}
						phraseCount={phrasesPerPlaylist[playlist.id] ?? 0}
					/>
				))}
			</div>
		</section>
	)
}

function PlaylistCard({
	playlist,
	phraseCount,
}: {
	playlist: {
		id: string
		lang: string
		title: string
		description: string | null
		href: string | null
		upvote_count: number
	}
	phraseCount: number
}) {
	return (
		<Card className="flex flex-col transition-shadow hover:shadow-md">
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<LangBadge lang={playlist.lang} />
					<Badge variant="secondary">
						{playlist.upvote_count > 5 ? 'Popular' : 'New'}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="flex-1 pb-4">
				<h3 className="line-clamp-2 font-semibold">{playlist.title}</h3>
				{playlist.description && (
					<p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
						{playlist.description}
					</p>
				)}
				{playlist.href && (
					<a
						href={playlist.href}
						target="_blank"
						rel="noopener noreferrer"
						className="text-muted-foreground mt-2 flex items-center gap-1 text-xs hover:underline"
					>
						<ExternalLink className="size-3" />
						{new URL(playlist.href).hostname}
					</a>
				)}
			</CardContent>
			<CardFooter className="flex-col gap-3 border-t pt-4">
				<div className="flex w-full items-center justify-between text-sm">
					<div className="text-center">
						<p className="font-semibold">{phraseCount}</p>
						<p className="text-muted-foreground text-xs">Cards</p>
					</div>
					<div className="text-center">
						<p className="font-semibold">{playlist.upvote_count}</p>
						<p className="text-muted-foreground text-xs">Upvotes</p>
					</div>
				</div>
				<Link
					to="/learn/$lang/playlists/$playlistId"
					params={{ lang: playlist.lang, playlistId: playlist.id }}
					className={cn(buttonVariants({ variant: 'soft' }), 'w-full')}
				>
					Start Learning
				</Link>
			</CardFooter>
		</Card>
	)
}

function CTASection() {
	return (
		<section className="bg-0-lo-primary rounded-lg border p-8 text-center">
			<h2 className="text-2xl font-bold">Ready to start learning?</h2>
			<p className="text-muted-foreground mt-2">
				Join our community of language learners today
			</p>
			<div className="mt-6 flex flex-row items-center justify-center gap-4">
				<Link to="/signup" className={buttonVariants({ size: 'lg' })}>
					Create Free Account
				</Link>
				<Link
					to="/login"
					className={buttonVariants({ variant: 'soft', size: 'lg' })}
				>
					Learn More
				</Link>
			</div>
		</section>
	)
}
