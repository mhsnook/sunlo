import { Activity, type CSSProperties } from 'react'
import { Logs } from 'lucide-react'
import { createFileRoute, Link } from '@tanstack/react-router'
import * as z from 'zod'

import type { FeedActivityType } from '@/features/feed/schemas'
import type { FeedFilterType } from '@/features/feed/hooks'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import languages from '@/lib/languages'
import { FeedComposer } from '@/components/feed/feed-composer'
import {
	useFeedLang,
	useFilteredFeedLang,
	useFriendsFeedLang,
	useFilteredFriendsFeedLang,
	useFriendUids,
	usePopularFeedLang,
	useFilteredPopularFeedLang,
} from '@/features/feed/hooks'
import { FeedItem } from '@/components/feed/feed-item'
import { FeedEmptyState } from '@/components/feed/feed-empty-state'
import { Button } from '@/components/ui/button'
import { FeedFilterMenu } from '@/components/feed/feed-filter-menu'

type PhraseGroup = {
	type: 'phrase_group'
	items: FeedActivityType[]
	earliest_created_at: string
}

type GroupedFeedItem = FeedActivityType | PhraseGroup

// Helper to get effective created_at for sorting (earliest for groups)
function getEffectiveCreatedAt(item: GroupedFeedItem): string {
	if ('earliest_created_at' in item) {
		return item.earliest_created_at
	}
	return item.created_at
}

// Helper function to group consecutive phrase additions by the same user
// Uses earliest created_at for groups to maintain stable sort order when loading more
function groupConsecutivePhrases(items: FeedActivityType[]): GroupedFeedItem[] {
	const grouped: GroupedFeedItem[] = []
	let currentGroup: FeedActivityType[] = []

	for (const item of items) {
		if (item.type === 'phrase') {
			if (currentGroup.length === 0 || currentGroup[0].uid === item.uid) {
				currentGroup.push(item)
			} else {
				// Different user, flush current group
				if (currentGroup.length > 1) {
					grouped.push({
						type: 'phrase_group',
						items: currentGroup,
						earliest_created_at:
							currentGroup[currentGroup.length - 1].created_at,
					})
				} else {
					grouped.push(currentGroup[0])
				}
				currentGroup = [item]
			}
		} else {
			// Non-phrase item, flush current group
			if (currentGroup.length > 1) {
				grouped.push({
					type: 'phrase_group',
					items: currentGroup,
					earliest_created_at: currentGroup[currentGroup.length - 1].created_at,
				})
			} else if (currentGroup.length === 1) {
				grouped.push(currentGroup[0])
			}
			currentGroup = []
			grouped.push(item)
		}
	}

	// Flush remaining group
	if (currentGroup.length > 1) {
		grouped.push({
			type: 'phrase_group',
			items: currentGroup,
			earliest_created_at: currentGroup[currentGroup.length - 1].created_at,
		})
	} else if (currentGroup.length === 1) {
		grouped.push(currentGroup[0])
	}

	// Sort by effective created_at to maintain stable order after grouping
	return grouped.toSorted(
		(a, b) =>
			new Date(getEffectiveCreatedAt(b)).getTime() -
			new Date(getEffectiveCreatedAt(a)).getTime()
	)
}

// Merge client-filtered items from the unfiltered query with server-filtered backfill.
// Client-filtered items appear instantly; server items fill in older results.
function mergeFilteredFeed(
	unfilteredItems: Array<FeedActivityType> | undefined,
	filterType: FeedFilterType | undefined,
	filteredQuery: {
		data: { pages: Array<Array<FeedActivityType>> } | undefined
		hasNextPage: boolean
		fetchNextPage: () => void
		isFetchingNextPage: boolean
		isLoading: boolean
	}
) {
	const allUnfiltered = unfilteredItems ?? []

	// No filter active — just use unfiltered items as-is
	if (!filterType) {
		return { items: allUnfiltered }
	}

	// Client-side filter from already-loaded unfiltered pages
	const clientFiltered = allUnfiltered.filter(
		(item) => item.type === filterType
	)

	// Server-filtered backfill
	const serverFiltered = filteredQuery.data?.pages.flat() ?? []

	// Merge + dedupe by ID, sort by created_at DESC
	const seen = new Set<string>()
	const merged = [...clientFiltered, ...serverFiltered]
		.filter((item) => {
			if (seen.has(item.id)) return false
			seen.add(item.id)
			return true
		})
		.toSorted(
			(a, b) =>
				new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
		)

	return {
		items: merged,
		hasNextPage: filteredQuery.hasNextPage,
		fetchNextPage: filteredQuery.fetchNextPage,
		isFetchingNextPage: filteredQuery.isFetchingNextPage,
		// Only show loading if we have zero client results AND server is still loading
		isBackfillLoading: clientFiltered.length === 0 && filteredQuery.isLoading,
	}
}

const SearchSchema = z.object({
	feed: z.enum(['newest', 'friends', 'popular']).optional(),
	filter_type: z.enum(['request', 'playlist', 'phrase']).optional(),
})

export const Route = createFileRoute('/_user/learn/$lang/feed')({
	validateSearch: SearchSchema,
	component: DeckFeedPage,
	beforeLoad: ({ params: { lang } }) => ({
		titleBar: {
			title: `Activity feed for ${languages[lang]}`,
			subtitle: 'See what people are learning all across the network',
			onBackClick: '/learn',
		},
	}),
})

const style = { viewTransitionName: `main-area` } as CSSProperties

const feedTabClass =
	'data-[active]:bg-transparent data-[active]:shadow-none data-[active]:border-none data-[active]:text-foreground text-muted-foreground rounded-none border-none px-2 py-1 text-xs font-medium'

function DeckFeedPage() {
	const navigate = Route.useNavigate()
	const handleValueChange = (value: string) => {
		void navigate({
			search: { feed: value as 'newest' | 'friends' | 'popular' },
		})
	}
	const search = Route.useSearch()
	const params = Route.useParams()
	const activeTab = search.feed ?? 'newest'
	return (
		<main data-testid="deck-feed-page" style={style}>
			<div className="mb-2 flex flex-row items-center justify-between gap-2">
				<Tabs
					className="w-full"
					value={activeTab}
					onValueChange={handleValueChange}
				>
					<FeedComposer lang={params.lang} />
					<div className="mb-3 flex items-center justify-between">
						<div className="flex items-center gap-1">
							<Logs className="text-muted-foreground ms-1 size-3.5" />
							<TabsList className="h-auto gap-0 border-none bg-transparent p-0 shadow-none inset-shadow-none">
								<TabsTrigger value="newest" className={feedTabClass}>
									Newest
								</TabsTrigger>
								<TabsTrigger value="friends" className={feedTabClass}>
									Friends
								</TabsTrigger>
								<TabsTrigger
									value="popular"
									data-testid="feed-tab-popular"
									className={feedTabClass}
								>
									Popular
								</TabsTrigger>
							</TabsList>
						</div>
						<FeedFilterMenu />
					</div>
					<TabsContent value="newest">
						<Activity mode={activeTab === 'newest' ? 'visible' : 'hidden'}>
							<RecentFeed />
						</Activity>
					</TabsContent>
					<TabsContent value="friends">
						<Activity mode={activeTab === 'friends' ? 'visible' : 'hidden'}>
							<FriendsFeed />
						</Activity>
					</TabsContent>
					<TabsContent value="popular">
						<Activity mode={activeTab === 'popular' ? 'visible' : 'hidden'}>
							<PopularFeed />
						</Activity>
					</TabsContent>
				</Tabs>
			</div>
		</main>
	)
}

function RecentFeed() {
	const params = Route.useParams()
	const search = Route.useSearch()
	const filterType = search.filter_type

	// Main unfiltered query (always runs)
	const mainQuery = useFeedLang(params.lang)
	const unfilteredItems = mainQuery.data?.pages.flat()

	// Filtered backfill query (only when filter active)
	const filteredQuery = useFilteredFeedLang(params.lang, filterType)

	// Merge: instant client-filtered + server backfill
	const merged = mergeFilteredFeed(unfilteredItems, filterType, filteredQuery)

	// Group consecutive phrases
	const groupedItems =
		merged.items.length === 0 ? [] : groupConsecutivePhrases(merged.items)

	// Use main query pagination when unfiltered, filtered query pagination when filtered
	const hasNextPage =
		filterType ?
			(merged.hasNextPage ?? false)
		:	(mainQuery.hasNextPage ?? false)
	const fetchNextPage =
		filterType ? (merged.fetchNextPage ?? (() => {})) : mainQuery.fetchNextPage
	const isFetchingNextPage =
		filterType ?
			(merged.isFetchingNextPage ?? false)
		:	mainQuery.isFetchingNextPage
	const isLoading = mainQuery.isLoading || (merged.isBackfillLoading ?? false)

	return (
		<div className="space-y-4" data-testid="feed-item-list">
			{isLoading ?
				<p>Loading feed...</p>
			: groupedItems.length === 0 ?
				<FeedEmptyState
					filterType={filterType}
					feedTab="newest"
					lang={params.lang}
				/>
			:	<>
					{groupedItems.map((item) => (
						<FeedItem
							key={
								'earliest_created_at' in item ?
									`group-${item.earliest_created_at}`
								:	item.id
							}
							item={item}
						/>
					))}

					{hasNextPage ?
						<Button
							variant="soft"
							onClick={() => void fetchNextPage()}
							data-testid="load-more-button"
							disabled={isFetchingNextPage}
						>
							{isFetchingNextPage ? 'Loading...' : 'Load More'}
						</Button>
					:	<p className="text-muted-foreground my-6 ms-6 italic">
							This is the end of the feed... how about{' '}
							<Link
								to="/friends/invite"
								from={Route.fullPath}
								className="s-link-muted"
							>
								inviting a friend
							</Link>{' '}
							to learn together?
						</p>
					}
				</>
			}
		</div>
	)
}

function FriendsFeed() {
	const params = Route.useParams()
	const search = Route.useSearch()
	const filterType = search.filter_type

	// Main unfiltered friends query (always runs)
	const mainQuery = useFriendsFeedLang(params.lang)
	const unfilteredItems = mainQuery.data?.pages.flat()

	// Need friend UIDs for filtered query
	const { data: friends } = useFriendUids()
	const friendUids = friends?.map((f) => f.uid) ?? []

	// Filtered backfill query (only when filter active)
	const filteredQuery = useFilteredFriendsFeedLang(
		params.lang,
		filterType,
		friendUids
	)

	// Merge: instant client-filtered + server backfill
	const merged = mergeFilteredFeed(unfilteredItems, filterType, filteredQuery)

	// Group consecutive phrases
	const groupedItems =
		merged.items.length === 0 ? [] : groupConsecutivePhrases(merged.items)

	const hasNextPage =
		filterType ?
			(merged.hasNextPage ?? false)
		:	(mainQuery.hasNextPage ?? false)
	const fetchNextPage =
		filterType ? (merged.fetchNextPage ?? (() => {})) : mainQuery.fetchNextPage
	const isFetchingNextPage =
		filterType ?
			(merged.isFetchingNextPage ?? false)
		:	mainQuery.isFetchingNextPage
	const isLoading = mainQuery.isLoading || (merged.isBackfillLoading ?? false)

	return (
		<div className="space-y-4" data-testid="feed-item-list">
			{isLoading ?
				<p>Loading feed...</p>
			: groupedItems.length === 0 ?
				<FeedEmptyState
					filterType={filterType}
					feedTab="friends"
					lang={params.lang}
				/>
			:	<>
					{groupedItems.map((item) => (
						<FeedItem
							key={
								'earliest_created_at' in item ?
									`group-${item.earliest_created_at}`
								:	item.id
							}
							item={item}
						/>
					))}

					{hasNextPage ?
						<Button
							variant="soft"
							onClick={() => void fetchNextPage()}
							data-testid="load-more-button"
							disabled={isFetchingNextPage}
						>
							{isFetchingNextPage ? 'Loading...' : 'Load More'}
						</Button>
					:	<p className="text-muted-foreground my-6 ms-6 italic">
							This is the end of the feed... how about{' '}
							<Link
								to="/friends/invite"
								from={Route.fullPath}
								className="s-link-muted"
							>
								inviting a friend
							</Link>{' '}
							to learn together?
						</p>
					}
				</>
			}
		</div>
	)
}

function PopularFeed() {
	const params = Route.useParams()
	const search = Route.useSearch()
	const filterType = search.filter_type

	// Main unfiltered popular query (always runs)
	const mainQuery = usePopularFeedLang(params.lang)
	const unfilteredItems = mainQuery.data?.pages.flat()

	// Filtered backfill query (only when filter active)
	const filteredQuery = useFilteredPopularFeedLang(params.lang, filterType)

	// Merge: instant client-filtered + server backfill
	// No grouping for Popular feed to preserve popularity order
	const merged = mergeFilteredFeed(unfilteredItems, filterType, filteredQuery)

	const hasNextPage =
		filterType ?
			(merged.hasNextPage ?? false)
		:	(mainQuery.hasNextPage ?? false)
	const fetchNextPage =
		filterType ? (merged.fetchNextPage ?? (() => {})) : mainQuery.fetchNextPage
	const isFetchingNextPage =
		filterType ?
			(merged.isFetchingNextPage ?? false)
		:	mainQuery.isFetchingNextPage
	const isLoading = mainQuery.isLoading || (merged.isBackfillLoading ?? false)

	return (
		<div className="space-y-4" data-testid="feed-item-list">
			{isLoading ?
				<p>Loading feed...</p>
			: merged.items.length === 0 ?
				<FeedEmptyState
					filterType={filterType}
					feedTab="popular"
					lang={params.lang}
				/>
			:	<>
					{merged.items.map((item) => (
						<FeedItem key={item.id} item={item} />
					))}

					{hasNextPage ?
						<Button
							variant="soft"
							onClick={() => void fetchNextPage()}
							data-testid="load-more-button"
							disabled={isFetchingNextPage}
						>
							{isFetchingNextPage ? 'Loading...' : 'Load More'}
						</Button>
					:	<p className="text-muted-foreground my-6 ms-6 italic">
							This is the end of the feed... how about{' '}
							<Link
								to="/friends/invite"
								from={Route.fullPath}
								className="s-link-muted"
							>
								inviting a friend
							</Link>{' '}
							to learn together?
						</p>
					}
				</>
			}
		</div>
	)
}
