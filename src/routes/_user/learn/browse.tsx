import {
	type CSSProperties,
	type SetStateAction,
	useState,
	useMemo,
	useEffect,
} from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useDebounce } from '@uidotdev/usehooks'
import { eq, useLiveQuery } from '@tanstack/react-db'
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
	X,
} from 'lucide-react'

import {
	languagesCollection,
	langTagsCollection,
	phraseRequestsCollection,
	phrasePlaylistsCollection,
	phrasesCollection,
	playlistPhraseLinksCollection,
} from '@/lib/collections'
import { useAuth } from '@/lib/use-auth'
import languages from '@/lib/languages'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { LangBadge, Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FancyMultiSelect } from '@/components/ui/multi-select'
import { cn } from '@/lib/utils'
import Flagged from '@/components/flagged'
import * as z from 'zod'

const BrowseSearchSchema = z.object({
	q: z.string().optional(),
	langs: z.string().optional(),
	tags: z.string().optional(),
})

type BrowseSearchType = z.infer<typeof BrowseSearchSchema>

export const Route = createFileRoute('/_user/learn/browse')({
	validateSearch: BrowseSearchSchema,
	beforeLoad: () => ({
		titleBar: {
			title: 'Explore Languages',
			subtitle:
				'Browse popular languages, requests, and playlists from our community',
		},
	}),
	loader: async () => {
		await languagesCollection.preload()
		await langTagsCollection.preload()
		await phraseRequestsCollection.preload()
		await phrasePlaylistsCollection.preload()
		await phrasesCollection.preload()
		await playlistPhraseLinksCollection.preload()
	},
	component: BrowsePage,
})

const style = { viewTransitionName: 'main-area' } as CSSProperties

function BrowsePage() {
	const { isAuth } = useAuth()
	const navigate = useNavigate({ from: Route.fullPath })
	const {
		q: searchText,
		langs: langsFilter,
		tags: tagsFilter,
	} = Route.useSearch()

	// Local state for live typing (debounced to URL)
	const [liveText, setLiveText] = useState(searchText ?? '')
	const debouncedText = useDebounce(liveText, 150)

	// Sync debounced text to URL
	useEffect(() => {
		if (debouncedText !== searchText) {
			void navigate({
				search: (prev) => ({
					...prev,
					q: debouncedText || undefined,
				}),
				replace: true,
			})
		}
	}, [debouncedText, searchText, navigate])

	// Parse comma-separated filter strings
	const selectedTags = tagsFilter ? tagsFilter.split(',').filter(Boolean) : []
	const selectedLangs =
		langsFilter ? langsFilter.split(',').filter(Boolean) : []

	// Get all tags for the filter
	const { data: allTags } = useLiveQuery((q) =>
		q.from({ tag: langTagsCollection })
	)

	// Get all languages for the filter
	const { data: allLanguages } = useLiveQuery((q) =>
		q.from({ lang: languagesCollection })
	)

	const tagOptions = useMemo(
		() =>
			[...new Set(allTags?.map((t) => t.name) ?? [])].map((name) => ({
				value: name,
				label: name,
			})),
		[allTags]
	)

	const langOptions = useMemo(
		() =>
			(allLanguages ?? []).map((l) => ({
				value: l.lang,
				label: l.name,
			})),
		[allLanguages]
	)

	// Find matching tags based on search query (for suggestions)
	const matchingTagSuggestions = useMemo(() => {
		if (!liveText.trim() || liveText.length < 2) return []
		const lowerQuery = liveText.toLowerCase()
		return tagOptions
			.filter(
				(t) =>
					t.label.toLowerCase().includes(lowerQuery) &&
					!selectedTags.includes(t.value)
			)
			.slice(0, 5)
	}, [liveText, tagOptions, selectedTags])

	// Find matching languages based on search query (for suggestions)
	const matchingLangSuggestions = useMemo(() => {
		if (!liveText.trim() || liveText.length < 2) return []
		const lowerQuery = liveText.toLowerCase()
		return langOptions
			.filter(
				(l) =>
					l.label.toLowerCase().includes(lowerQuery) &&
					!selectedLangs.includes(l.value)
			)
			.slice(0, 5)
	}, [liveText, langOptions, selectedLangs])

	const isSearching =
		liveText.trim().length > 0 ||
		selectedTags.length > 0 ||
		selectedLangs.length > 0

	const setSelectedTags = (value: SetStateAction<Array<string>>) => {
		void navigate({
			search: (prev: BrowseSearchType) => {
				const newTags =
					typeof value === 'function' ? value(selectedTags) : value
				return {
					...prev,
					tags: newTags.length ? newTags.join(',') : undefined,
				}
			},
			replace: true,
		})
	}

	const setSelectedLangs = (value: SetStateAction<Array<string>>) => {
		void navigate({
			search: (prev: BrowseSearchType) => {
				const newLangs =
					typeof value === 'function' ? value(selectedLangs) : value
				return {
					...prev,
					langs: newLangs.length ? newLangs.join(',') : undefined,
				}
			},
			replace: true,
		})
	}

	const addTagFilter = (tag: string) => {
		setSelectedTags((prev) => [...prev, tag])
	}

	const addLangFilter = (lang: string) => {
		setSelectedLangs((prev) => [...prev, lang])
	}

	return (
		<main style={style} className="space-y-8 pb-12">
			{/* Search Box */}
			<div className="space-y-3">
				<div className="relative">
					<Search className="text-muted-foreground absolute top-1/2 left-4 size-5 -translate-y-1/2" />
					<Input
						type="search"
						placeholder="Search phrases, playlists, and requests..."
						value={liveText}
						onChange={(e) => setLiveText(e.target.value)}
						className="h-14 rounded-2xl ps-12 pe-4 text-lg [&::-ms-clear]:hidden [&::-webkit-search-cancel-button]:hidden"
					/>
					{liveText && (
						<button
							type="button"
							onClick={() => setLiveText('')}
							className="text-muted-foreground hover:text-foreground absolute top-1/2 right-4 -translate-y-1/2"
						>
							<X className="size-5" />
							<span className="sr-only">Clear search</span>
						</button>
					)}
				</div>

				{/* Suggestion chips for matching languages and tags */}
				{(matchingLangSuggestions.length > 0 ||
					matchingTagSuggestions.length > 0) && (
					<div className="flex flex-col items-start gap-2">
						{matchingLangSuggestions.length > 0 && (
							<div className="inline-flex flex-row gap-2">
								<span className="text-muted-foreground text-sm">
									Languages:
								</span>
								{matchingLangSuggestions.map((lang) => (
									<button
										key={lang.value}
										type="button"
										onClick={() => addLangFilter(lang.value)}
										className="bg-primary/10 text-primary hover:bg-primary/20 rounded-full px-3 py-1 text-sm transition-colors"
									>
										+ {lang.label}
									</button>
								))}
							</div>
						)}
						{matchingTagSuggestions.length > 0 && (
							<div className="inline-flex flex-row gap-2">
								<span className="text-muted-foreground text-sm">Tags:</span>
								{matchingTagSuggestions.map((tag) => (
									<button
										key={tag.value}
										type="button"
										onClick={() => addTagFilter(tag.value)}
										className="bg-accent/50 text-accent-foreground hover:bg-accent/70 rounded-full px-3 py-1 text-sm transition-colors"
									>
										+ {tag.label}
									</button>
								))}
							</div>
						)}
					</div>
				)}

				{/* Filter controls */}
				<div className="flex flex-col gap-3 @md:flex-row">
					<div className="flex-1">
						<FancyMultiSelect
							options={langOptions}
							selected={selectedLangs}
							setSelected={setSelectedLangs}
							placeholder="Filter by language..."
						/>
					</div>
					<div className="flex-1">
						<FancyMultiSelect
							options={tagOptions}
							selected={selectedTags}
							setSelected={setSelectedTags}
							placeholder="Filter by tags..."
						/>
					</div>
				</div>
			</div>

			{/* Header with auth buttons for non-authenticated users */}
			{!isAuth && !isSearching && (
				<div className="flex flex-row items-center justify-end gap-2">
					<Link to="/login" className={buttonVariants({ variant: 'outline' })}>
						Sign In
					</Link>
					<Link to="/signup" className={buttonVariants()}>
						Get Started
					</Link>
				</div>
			)}

			{isSearching ?
				<SearchResultsSection
					query={liveText}
					selectedTags={selectedTags}
					selectedLangs={selectedLangs}
				/>
			:	<>
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
				</>
			}
		</main>
	)
}

function SearchResultsSection({
	query,
	selectedTags,
	selectedLangs,
}: {
	query: string
	selectedTags: Array<string>
	selectedLangs: Array<string>
}) {
	const lowerQuery = query.toLowerCase().trim()

	// Search phrases
	const { data: allPhrases } = useLiveQuery((q) =>
		q.from({ phrase: phrasesCollection })
	)

	// Search requests
	const { data: allRequests } = useLiveQuery((q) =>
		q
			.from({ req: phraseRequestsCollection })
			.where(({ req }) => eq(req.deleted, false))
	)

	// Search playlists
	const { data: allPlaylists } = useLiveQuery((q) =>
		q
			.from({ playlist: phrasePlaylistsCollection })
			.where(({ playlist }) => eq(playlist.deleted, false))
	)

	// Filter results based on search query, tags, and languages
	const matchingPhrases = useMemo(() => {
		if (!allPhrases) return []
		return allPhrases
			.filter((phrase) => {
				// Language filter
				if (selectedLangs.length > 0 && !selectedLangs.includes(phrase.lang)) {
					return false
				}
				// Tag filter
				if (selectedTags.length > 0) {
					const phraseTags = new Set((phrase.tags ?? []).map((t) => t.name))
					if (!selectedTags.some((t) => phraseTags.has(t))) {
						return false
					}
				}
				// Text search (only if there's a query)
				if (lowerQuery) {
					const searchText = [
						phrase.text,
						...(phrase.translations?.map((t) => t.text) ?? []),
						...(phrase.tags ?? []).map((t) => t.name),
					]
						.join(' ')
						.toLowerCase()
					return searchText.includes(lowerQuery)
				}
				return true
			})
			.slice(0, 10)
	}, [allPhrases, lowerQuery, selectedTags, selectedLangs])

	const matchingRequests = useMemo(() => {
		if (!allRequests) return []
		return allRequests
			.filter((req) => {
				// Language filter
				if (selectedLangs.length > 0 && !selectedLangs.includes(req.lang)) {
					return false
				}
				// Text search (only if there's a query)
				if (lowerQuery) {
					return req.prompt.toLowerCase().includes(lowerQuery)
				}
				return true
			})
			.slice(0, 6)
	}, [allRequests, lowerQuery, selectedLangs])

	const matchingPlaylists = useMemo(() => {
		if (!allPlaylists) return []
		return allPlaylists
			.filter((playlist) => {
				// Language filter
				if (
					selectedLangs.length > 0 &&
					!selectedLangs.includes(playlist.lang)
				) {
					return false
				}
				// Text search (only if there's a query)
				if (lowerQuery) {
					const searchText = [playlist.title, playlist.description ?? '']
						.join(' ')
						.toLowerCase()
					return searchText.includes(lowerQuery)
				}
				return true
			})
			.slice(0, 6)
	}, [allPlaylists, lowerQuery, selectedLangs])

	const totalResults =
		matchingPhrases.length + matchingRequests.length + matchingPlaylists.length

	// Build filter description
	const filterParts: Array<string> = []
	if (query) filterParts.push(`"${query}"`)
	if (selectedLangs.length > 0)
		filterParts.push(`${selectedLangs.length} language(s)`)
	if (selectedTags.length > 0) filterParts.push(`${selectedTags.length} tag(s)`)
	const filterDescription = filterParts.join(', ')

	if (totalResults === 0) {
		return (
			<div className="py-12 text-center">
				<p className="text-muted-foreground text-lg">
					No results found{filterDescription ? ` for ${filterDescription}` : ''}
				</p>
				<p className="text-muted-foreground mt-2 text-sm">
					Try different search terms or filters
				</p>
			</div>
		)
	}

	return (
		<div className="space-y-8">
			<p className="text-muted-foreground">
				Found {totalResults} result{totalResults !== 1 ? 's' : ''}
				{filterDescription ? ` for ${filterDescription}` : ''}
			</p>

			{/* Matching Phrases */}
			{matchingPhrases.length > 0 && (
				<section>
					<h2 className="mb-4 text-xl font-bold">
						Phrases ({matchingPhrases.length})
					</h2>
					<div className="divide-y rounded-lg border">
						{matchingPhrases.map((phrase) => (
							<Link
								key={phrase.id}
								to="/learn/$lang/phrases/$id"
								params={{ lang: phrase.lang, id: phrase.id }}
								className="hover:bg-muted/50 flex items-center gap-3 p-4 transition-colors"
							>
								<LangBadge lang={phrase.lang} />
								<div className="min-w-0 flex-1">
									<p className="truncate font-medium">{phrase.text}</p>
									{phrase.translations?.[0] && (
										<p className="text-muted-foreground truncate text-sm">
											{phrase.translations[0].text}
										</p>
									)}
								</div>
							</Link>
						))}
					</div>
				</section>
			)}

			{/* Matching Requests */}
			{matchingRequests.length > 0 && (
				<section>
					<h2 className="mb-4 text-xl font-bold">
						Requests ({matchingRequests.length})
					</h2>
					<div className="grid grid-cols-1 gap-4 @lg:grid-cols-2">
						{matchingRequests.map((request) => (
							<RequestCard key={request.id} request={request} />
						))}
					</div>
				</section>
			)}

			{/* Matching Playlists */}
			{matchingPlaylists.length > 0 && (
				<section>
					<h2 className="mb-4 text-xl font-bold">
						Playlists ({matchingPlaylists.length})
					</h2>
					<div className="grid grid-cols-1 gap-4 @md:grid-cols-2 @xl:grid-cols-3">
						{matchingPlaylists.map((playlist) => (
							<PlaylistCard
								key={playlist.id}
								playlist={playlist}
								phraseCount={0}
							/>
						))}
					</div>
				</section>
			)}
		</div>
	)
}

function StatsSection() {
	const { data: allLanguages } = useLiveQuery((q) =>
		q.from({ lang: languagesCollection })
	)
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
						<div className="bg-primary/10 text-primary rounded-full p-3">
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
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

	const { data: allLanguages } = useLiveQuery((q) =>
		q
			.from({ lang: languagesCollection })
			.orderBy(({ lang }) => lang.learners, 'desc')
	)

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
			<div className="mb-4 flex flex-row items-start justify-between">
				<div>
					<h2 className="text-2xl font-bold">Most Active Languages</h2>
					<p className="text-muted-foreground">
						Start learning with our most popular language communities
					</p>
				</div>
				<div className="flex gap-1 rounded-lg border p-1">
					<Button
						variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
						size="sm"
						onClick={() => setViewMode('grid')}
					>
						<LayoutGrid className="size-4" />
						<span className="sr-only">Grid View</span>
					</Button>
					<Button
						variant={viewMode === 'list' ? 'secondary' : 'ghost'}
						size="sm"
						onClick={() => setViewMode('list')}
					>
						<List className="size-4" />
						<span className="sr-only">List View</span>
					</Button>
				</div>
			</div>

			{viewMode === 'grid' ?
				<div className="grid grid-cols-1 gap-4 @md:grid-cols-2 @xl:grid-cols-3">
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
			:	<div className="divide-y rounded-lg border">
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
			}
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
		<Card>
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
					className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
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
		<div className="flex flex-row items-center justify-between gap-4 p-4">
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
					className={buttonVariants({ variant: 'outline', size: 'sm' })}
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
			.from({ req: phraseRequestsCollection })
			.where(({ req }) => eq(req.deleted, false))
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
					className={buttonVariants({ variant: 'outline', size: 'sm' })}
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
			.from({ playlist: phrasePlaylistsCollection })
			.where(({ playlist }) => eq(playlist.deleted, false))
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
					className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
				>
					Start Learning
				</Link>
			</CardFooter>
		</Card>
	)
}

function CTASection() {
	return (
		<section className="bg-primary/5 rounded-lg border p-8 text-center">
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
					className={buttonVariants({ variant: 'outline', size: 'lg' })}
				>
					Learn More
				</Link>
			</div>
		</section>
	)
}
