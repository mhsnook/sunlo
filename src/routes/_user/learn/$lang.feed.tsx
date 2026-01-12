import { Activity, useMemo, type CSSProperties } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import * as z from 'zod'
import { Construction } from 'lucide-react'

import type { FeedActivityType } from '@/lib/schemas'
import { buttonVariants } from '@/components/ui/button-variants'
import {
	useMyFriendsRequestsLang,
	usePopularRequestsLang,
} from '@/hooks/use-requests'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import Callout from '@/components/ui/callout'
import { RequestItem } from '@/components/requests/request-list-item'
import languages from '@/lib/languages'
import { PlusMenu } from '@/components/plus-menu'
import { useFeedLang } from '@/hooks/use-feed'
import { FeedItem } from '@/components/feed/feed-item'
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

const SearchSchema = z.object({
	feed: z.enum(['newest', 'friends', 'popular']).optional(),
	filter_requests: z.boolean().optional(),
	filter_playlists: z.boolean().optional(),
	filter_phrases: z.boolean().optional(),
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
		<main style={style}>
			<div className="mb-2 flex flex-row items-center justify-between gap-2">
				<Tabs
					className="w-full"
					value={activeTab}
					onValueChange={handleValueChange}
				>
					<div className="mb-4 flex flex-row items-center justify-between gap-2">
						<TabsList>
							<TabsTrigger value="newest">Newest</TabsTrigger>
							<TabsTrigger value="friends">Friends</TabsTrigger>
							<TabsTrigger value="popular">Popular</TabsTrigger>
						</TabsList>
						<div className="flex items-center gap-2">
							<FeedFilterMenu />
							<PlusMenu lang={params.lang} />
						</div>
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
	const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useFeedLang(params.lang)

	// flatten pages, apply filters, and group consecutive phrases
	const groupedItems = useMemo(() => {
		const feedItems = data?.pages.flat()
		if (!feedItems) return []

		// Apply filters (default all to true)
		const filterRequests = search.filter_requests ?? true
		const filterPlaylists = search.filter_playlists ?? true
		const filterPhrases = search.filter_phrases ?? true
		const filteredItems = feedItems.filter((item) => {
			if (item.type === 'request') return filterRequests
			if (item.type === 'playlist') return filterPlaylists
			if (item.type === 'phrase') return filterPhrases
			return true
		})

		return groupConsecutivePhrases(filteredItems)
	}, [
		data,
		search.filter_requests,
		search.filter_playlists,
		search.filter_phrases,
	])

	return (
		<div className="space-y-4">
			{isLoading ?
				<p>Loading feed...</p>
			: !groupedItems || groupedItems.length === 0 ?
				<Callout variant="ghost">
					<p className="mb-4 text-lg italic">This feed is empty.</p>
					<div className="flex flex-row gap-2">
						<Link
							className={buttonVariants()}
							to="/learn/$lang/requests/new"
							from={Route.fullPath}
						>
							Post a request for a new phrase
						</Link>
						{(
							(search.filter_requests ?? true) &&
							(search.filter_playlists ?? true) &&
							(search.filter_phrases ?? true)
						) ?
							null
						:	<Link
								className={buttonVariants()}
								search={{}}
								from={Route.fullPath}
							>
								Clear feed filters
							</Link>}
					</div>
				</Callout>
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
							variant="outline"
							// oxlint-disable-next-line jsx-no-new-function-as-prop
							onClick={() => void fetchNextPage()}
							disabled={isFetchingNextPage}
							className={hasNextPage ? 'opacity-100' : 'opacity-0'}
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
	const { data: requests, isLoading } = useMyFriendsRequestsLang(params.lang)
	return (
		<div className="space-y-3">
			{isLoading ?
				<p>Loading requests...</p>
			: !requests || requests.length === 0 ?
				<Callout Icon={Construction}>
					<p className="mb-4 text-lg italic">
						This feed is empty. Maybe you need to add some friends?
					</p>
					<div className="space-y-2 space-x-2">
						<Link
							className={buttonVariants()}
							to="/friends"
							from={Route.fullPath}
						>
							Search for a friend
						</Link>
						<Link
							className={buttonVariants()}
							to="/learn/$lang/requests/new"
							from={Route.fullPath}
						>
							Post a request
						</Link>
					</div>
				</Callout>
			:	requests.map((request) => (
					<RequestItem key={request.id} request={request} />
				))
			}
			<p className="text-muted-foreground my-6 ms-6 italic">
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
		</div>
	)
}

function PopularFeed() {
	const params = Route.useParams()
	const { data: requests, isLoading } = usePopularRequestsLang(params.lang)
	return (
		<div className="space-y-3">
			{isLoading ?
				<p>Loading requests...</p>
			: !requests || requests.length === 0 ?
				<div className="p-4">
					<p className="mb-4 text-lg italic">
						This feed is empty. You might have to be the one to lead the way!
					</p>
					<Link
						className={buttonVariants()}
						to="/learn/$lang/requests/new"
						from={Route.fullPath}
					>
						Post a request for a new phrase
					</Link>
				</div>
			:	requests.map((request) => (
					<RequestItem key={request.id} request={request} />
				))
			}
			<p className="text-muted-foreground my-6 ms-6 italic">
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
		</div>
	)
}
