import {
	type CSSProperties,
	type ReactNode,
	useEffect,
	useMemo,
	useState,
} from 'react'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { eq, useLiveQuery } from '@tanstack/react-db'
import * as z from 'zod'

import languages from '@/lib/languages'
import { setLangTheme, useLangPopularityReady } from '@/lib/lang-theme'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/use-debounce'

import { useLanguagePhrases } from '@/features/phrases/hooks'
import { useLanguageTags } from '@/features/languages/hooks'
import { useLangPlaylists } from '@/features/playlists/hooks'
import { phraseRequestsActive } from '@/features/requests/live'
import { useRequestsByMessageTag, useRequestTagSets } from '@/features/requests'
import {
	commentPhraseLinksCollection,
	commentsCollection,
	messageTagLinksCollection,
	messageTagsCollection,
	phraseRequestsCollection,
	phraseRequestUpvotesCollection,
} from '@/features/requests/collections'
import { cardsCollection, decksCollection } from '@/features/deck/collections'
import { publicProfilesCollection } from '@/features/profile/collections'
import type { PhraseFullType } from '@/features/phrases/schemas'
import type { uuid } from '@/types/main'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { RequestItem } from '@/components/requests/request-list-item'

import {
	BrowseSection,
	NewCardTile,
	PhraseStrip,
	SetTile,
	TagSetTile,
} from './-browse-discover'

const TabSchema = z.enum(['all', 'cards', 'sets', 'requests'])

const SearchSchema = z.object({
	tab: TabSchema.optional(),
	tag: z.string().optional(),
	level: z.coerce.number().int().min(1).max(5).optional(),
})

export const Route = createFileRoute('/_user/browse/$lang')({
	component: BrowseLanguagePage,
	validateSearch: SearchSchema,
	staticData: {
		search: 'content',
		appnav: [['/browse', '/browse/charts']],
		titleBar: ({ params }) => ({
			title: `Browse ${languages[params.lang] ?? params.lang}`,
			subtitle: 'Discover cards, sets, and discussions',
			onBackClick: '/browse',
		}),
	},
	beforeLoad: ({ params: { lang } }) => {
		if (!languages[lang]) throw notFound()
	},
	loader: async ({ context }) => {
		const preloads: Promise<unknown>[] = [
			// phrasesFull inner-joins public profiles, so without this the New
			// Cards grid (and request author avatars) would render empty.
			publicProfilesCollection.preload(),
			phraseRequestsCollection.preload(),
			commentsCollection.preload(),
			commentPhraseLinksCollection.preload(),
			// Request-tag "sets" join requests → their tag links → answer phrases.
			messageTagsCollection.preload(),
			messageTagLinksCollection.preload(),
		]
		if (context.auth.isAuth) {
			preloads.push(
				cardsCollection.preload(),
				decksCollection.preload(),
				phraseRequestUpvotesCollection.preload()
			)
		}
		await Promise.all(preloads)
	},
})

const style = { viewTransitionName: `main-area` } as CSSProperties

const LEVELS = [1, 2, 3, 4, 5] as const

// How many tiles a horizontal browse row / grouped list shows before it stops.
const STRIP_SIZE = 20
const GROUP_SIZE = 6
// Cap topic rows on the Cards tab so a tag-heavy language can't spawn a huge
// number of live phrase subscriptions at once.
const MAX_TOPIC_ROWS = 12

/** Map a phrase's average difficulty (0–10, often null) to a 1–5 level. */
function phraseLevel(avgDifficulty: number | null): number {
	if (avgDifficulty == null) return 1
	return Math.min(5, Math.max(1, Math.ceil(avgDifficulty / 2)))
}

function BrowseLanguagePage() {
	const { lang } = Route.useParams()
	const search = Route.useSearch()
	const navigate = Route.useNavigate()
	const ready = useLangPopularityReady()

	const tab = search.tab ?? 'all'
	const selectedTag = search.tag
	const level = search.level

	const [rawQuery, setRawQuery] = useState('')
	const query = useDebounce(rawQuery, 300).trim().toLowerCase()

	useEffect(() => {
		if (!ready) return
		setLangTheme(document.documentElement, lang)
		return () => setLangTheme()
	}, [lang, ready])

	const { data: tags } = useLanguageTags(lang)
	const { data: allPhrases } = useLanguagePhrases(lang)
	const { data: playlists } = useLangPlaylists(lang)
	const tagSets = useRequestTagSets(lang)
	const { data: requests } = useLiveQuery(
		(q) =>
			q
				.from({ request: phraseRequestsActive })
				.where(({ request }) => eq(request.lang, lang))
				.orderBy(({ request }) => request.created_at, 'desc'),
		[lang]
	)

	const phraseMatches = (p: PhraseFullType) => {
		if (selectedTag && !p.tags?.some((t) => t.name === selectedTag))
			return false
		if (level && phraseLevel(p.avg_difficulty) !== level) return false
		if (
			query &&
			!p.text.toLowerCase().includes(query) &&
			!p.translations?.some((t) => t.text.toLowerCase().includes(query))
		)
			return false
		return true
	}

	const filteredPhrases = useMemo(
		() =>
			(allPhrases ?? [])
				.filter(phraseMatches)
				.toSorted((a, b) => b.created_at.localeCompare(a.created_at)),
		[allPhrases, selectedTag, level, query]
	)

	const filteredPlaylists = useMemo(
		() =>
			(playlists ?? [])
				.filter(
					(p) =>
						!query ||
						p.title.toLowerCase().includes(query) ||
						(p.description?.toLowerCase().includes(query) ?? false)
				)
				.toSorted((a, b) => b.upvote_count - a.upvote_count),
		[playlists, query]
	)

	const filteredTagSets = useMemo(
		() =>
			tagSets.filter(
				(s) =>
					!query ||
					s.label.toLowerCase().includes(query) ||
					(s.description?.toLowerCase().includes(query) ?? false)
			),
		[tagSets, query]
	)

	const filteredRequests = useMemo(
		() =>
			(requests ?? []).filter(
				(r) => !query || r.prompt.toLowerCase().includes(query)
			),
		[requests, query]
	)

	// Newest phrases, for the "Recently added" browse row.
	const recentPids = useMemo(
		() =>
			(allPhrases ?? [])
				.toSorted((a, b) => b.created_at.localeCompare(a.created_at))
				.slice(0, STRIP_SIZE)
				.map((p) => p.id),
		[allPhrases]
	)

	// Phrases grouped by topic tag — one browse row per tag (a phrase with
	// several tags appears under each), largest topics first.
	const phraseTagGroups = useMemo(() => {
		const byTag = new Map<string, uuid[]>()
		for (const p of allPhrases ?? [])
			for (const t of p.tags ?? []) {
				const arr = byTag.get(t.name) ?? []
				arr.push(p.id)
				byTag.set(t.name, arr)
			}
		return (tags ?? [])
			.map((t) => ({ name: t.name, pids: byTag.get(t.name) ?? [] }))
			.filter((g) => g.pids.length > 0)
			.toSorted((a, b) => b.pids.length - a.pids.length)
	}, [allPhrases, tags])

	const { groups: requestGroups, untagged: untaggedRequests } =
		useRequestsByMessageTag(lang)

	const setSearchValue = (next: Partial<z.infer<typeof SearchSchema>>) =>
		void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true })

	const hasFilters = Boolean(query || selectedTag || level)

	// Playlists and request-tag sets share the "Popular Sets" grid. On the All
	// tab they share a budget of 4 tiles, playlists first.
	const setsBudget = tab === 'all' ? 4 : Infinity
	const visiblePlaylists = filteredPlaylists.slice(0, setsBudget)
	const visibleTagSets = filteredTagSets.slice(
		0,
		Math.max(0, setsBudget - visiblePlaylists.length)
	)
	const setsEmpty =
		filteredPlaylists.length === 0 && filteredTagSets.length === 0

	return (
		<main
			style={style}
			className="space-y-8 pb-12"
			data-testid="browse-lang-page"
		>
			<Tabs
				value={tab}
				onValueChange={(value) =>
					setSearchValue({ tab: TabSchema.parse(value) })
				}
			>
				<TabsList className="h-auto gap-4 border-none bg-transparent p-0">
					<BrowseTab value="all">All</BrowseTab>
					<BrowseTab value="cards">Cards</BrowseTab>
					<BrowseTab value="sets">Sets</BrowseTab>
					<BrowseTab value="requests">Requests</BrowseTab>
				</TabsList>

				{/* Filters — shared across every tab */}
				<div className="mt-6 space-y-4">
					<div>
						<h2 className="text-muted-foreground mb-3 text-lg font-semibold">
							What are you looking for?
						</h2>
						<div
							className="flex flex-wrap gap-2"
							data-testid="browse-topic-chips"
						>
							{tags?.map((tag) => {
								const active = selectedTag === tag.name
								return (
									<button
										key={tag.id}
										type="button"
										onClick={() =>
											setSearchValue({ tag: active ? undefined : tag.name })
										}
										data-key={tag.id}
										data-active={active || undefined}
										className={cn(
											'rounded-full px-4 py-1.5 text-sm transition-colors',
											active
												? 'bg-primary text-primary-foreground'
												: 'bg-1-lo-neutral text-6-mid-neutral hover:bg-2-lo-neutral'
										)}
									>
										{tag.name}
									</button>
								)
							})}
						</div>
					</div>

					<div className="flex flex-col gap-3 @md:flex-row @md:items-center">
						<Select
							value={level ? String(level) : 'all'}
							onValueChange={(value) =>
								setSearchValue({
									level: value === 'all' ? undefined : Number(value),
								})
							}
						>
							<SelectTrigger
								className="w-32 shrink-0"
								data-testid="browse-level-select"
							>
								<SelectValue placeholder="Level" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All levels</SelectItem>
								{LEVELS.map((l) => (
									<SelectItem key={l} value={String(l)}>
										Level {l}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Input
							type="search"
							value={rawQuery}
							onChange={(e) => setRawQuery(e.target.value)}
							placeholder="Search phrases, sets, topics, requests..."
							className="flex-1"
							data-testid="browse-lang-search-input"
						/>
					</div>
				</div>

				<TabsContent value={tab} className="mt-8 space-y-10">
					{/* ── All: a preview of each section, each with a "see more" that
					    swaps to the dedicated tab without leaving the page ── */}
					{tab === 'all' ? (
						<>
							{!setsEmpty ? (
								<BrowseSection
									title="Popular Sets"
									testid="browse-sets-section"
									seeMoreLabel="See more sets"
									onSeeMore={() => setSearchValue({ tab: 'sets' })}
								>
									<div className="grid grid-cols-1 gap-3 @2xl:grid-cols-2">
										{visiblePlaylists.map((p) => (
											<SetTile key={p.id} playlist={p} lang={lang} />
										))}
										{visibleTagSets.map((s) => (
											<TagSetTile key={s.slug} tagSet={s} lang={lang} />
										))}
									</div>
								</BrowseSection>
							) : null}

							{filteredPhrases.length ? (
								<BrowseSection
									title="New Cards"
									testid="browse-cards-section"
									seeMoreLabel="See more phrases"
									onSeeMore={() => setSearchValue({ tab: 'cards' })}
								>
									<div className="grid grid-cols-1 gap-3 @2xl:grid-cols-2">
										{filteredPhrases.slice(0, 4).map((p) => (
											<NewCardTile key={p.id} pid={p.id} />
										))}
									</div>
								</BrowseSection>
							) : null}

							{filteredRequests.length ? (
								<BrowseSection
									title="Active Discussions"
									testid="browse-requests-section"
									seeMoreLabel="See more discussions"
									onSeeMore={() => setSearchValue({ tab: 'requests' })}
								>
									<div className="space-y-4">
										{filteredRequests.slice(0, 3).map((r) => (
											<RequestItem key={r.id} request={r} />
										))}
									</div>
								</BrowseSection>
							) : null}

							{setsEmpty &&
							!filteredPhrases.length &&
							!filteredRequests.length ? (
								<EmptyBrowse />
							) : null}
						</>
					) : null}

					{/* ── Sets: playlists and request-tag topics, browseable ── */}
					{tab === 'sets' ? (
						<>
							{filteredPlaylists.length ? (
								<BrowseSection
									title="Playlists"
									testid="browse-sets-section"
									count={filteredPlaylists.length}
								>
									<div className="grid grid-cols-1 gap-3 @2xl:grid-cols-2">
										{filteredPlaylists.map((p) => (
											<SetTile key={p.id} playlist={p} lang={lang} />
										))}
									</div>
								</BrowseSection>
							) : null}

							{filteredTagSets.length ? (
								<BrowseSection
									title="Topics"
									dataKey="topics"
									testid={
										filteredPlaylists.length ? undefined : 'browse-sets-section'
									}
									count={filteredTagSets.length}
								>
									<div className="grid grid-cols-1 gap-3 @2xl:grid-cols-2">
										{filteredTagSets.map((s) => (
											<TagSetTile key={s.slug} tagSet={s} lang={lang} />
										))}
									</div>
								</BrowseSection>
							) : null}

							{setsEmpty ? <EmptyBrowse label="No sets to show yet." /> : null}
						</>
					) : null}

					{/* ── Cards: filtered flat, or browse rows by topic ── */}
					{tab === 'cards' ? (
						hasFilters ? (
							<BrowseSection
								title="Cards"
								testid="browse-cards-section"
								count={filteredPhrases.length}
							>
								{filteredPhrases.length ? (
									<div className="grid grid-cols-1 gap-3 @2xl:grid-cols-2">
										{filteredPhrases.map((p) => (
											<NewCardTile key={p.id} pid={p.id} />
										))}
									</div>
								) : (
									<EmptyText>No cards match your filters.</EmptyText>
								)}
							</BrowseSection>
						) : (
							<>
								{recentPids.length ? (
									<BrowseSection
										title="Recently added"
										testid="browse-cards-section"
									>
										<PhraseStrip pids={recentPids} />
									</BrowseSection>
								) : null}
								{phraseTagGroups.slice(0, MAX_TOPIC_ROWS).map((g) => (
									<BrowseSection
										key={g.name}
										title={g.name}
										dataKey={g.name}
										count={g.pids.length}
									>
										<PhraseStrip pids={g.pids.slice(0, STRIP_SIZE)} />
									</BrowseSection>
								))}
								{!recentPids.length && !phraseTagGroups.length ? (
									<EmptyBrowse label="No cards to show yet." />
								) : null}
							</>
						)
					) : null}

					{/* ── Requests: filtered flat, or grouped by message tag ── */}
					{tab === 'requests' ? (
						query ? (
							<BrowseSection
								title="Discussions"
								testid="browse-requests-section"
								count={filteredRequests.length}
							>
								{filteredRequests.length ? (
									<div className="space-y-4">
										{filteredRequests.map((r) => (
											<RequestItem key={r.id} request={r} />
										))}
									</div>
								) : (
									<EmptyText>No discussions match your search.</EmptyText>
								)}
							</BrowseSection>
						) : (
							<>
								{requestGroups.map((g, i) => (
									<BrowseSection
										key={g.slug}
										title={g.label}
										dataKey={g.slug}
										count={g.requests.length}
										testid={i === 0 ? 'browse-requests-section' : undefined}
									>
										<div className="space-y-4">
											{g.requests.slice(0, GROUP_SIZE).map((r) => (
												<RequestItem key={r.id} request={r} />
											))}
										</div>
									</BrowseSection>
								))}
								{untaggedRequests.length ? (
									<BrowseSection
										title="More discussions"
										dataKey="untagged"
										count={untaggedRequests.length}
										testid={
											requestGroups.length
												? undefined
												: 'browse-requests-section'
										}
									>
										<div className="space-y-4">
											{untaggedRequests.slice(0, GROUP_SIZE).map((r) => (
												<RequestItem key={r.id} request={r} />
											))}
										</div>
									</BrowseSection>
								) : null}
								{!requestGroups.length && !untaggedRequests.length ? (
									<EmptyBrowse label="No discussions to show yet." />
								) : null}
							</>
						)
					) : null}
				</TabsContent>
			</Tabs>
		</main>
	)
}

function BrowseTab({
	value,
	children,
}: {
	value: string
	children: ReactNode
}) {
	return (
		<TabsTrigger
			value={value}
			data-testid={`browse-tab-${value}`}
			className="data-[active]:border-primary text-muted-foreground data-[active]:text-foreground rounded-none border-0 border-b-2 border-transparent px-1 pb-2 text-base data-[active]:bg-transparent data-[active]:shadow-none"
		>
			{children}
		</TabsTrigger>
	)
}

function EmptyText({ children }: { children: ReactNode }) {
	return <p className="text-muted-foreground text-sm">{children}</p>
}

function EmptyBrowse({ label }: { label?: string }) {
	return (
		<div
			className="text-muted-foreground py-12 text-center text-sm"
			data-testid="browse-empty"
		>
			{label ?? 'Nothing to browse here yet.'}
		</div>
	)
}
