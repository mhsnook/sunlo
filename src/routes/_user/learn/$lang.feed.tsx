import { createFileRoute, Link } from '@tanstack/react-router'
import * as z from 'zod'
import { Construction, MessageSquareQuote } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button-variants'

import type { TitleBar } from '@/types/main'
import {
	useMyFriendsRequestsLang,
	usePopularRequestsLang,
	useRequestsLang,
} from '@/hooks/use-requests'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import Callout from '@/components/ui/callout'
import { RequestItem } from '@/components/requests/request-list-item'
import languages from '@/lib/languages'
import { Activity, useCallback } from 'react'

const SearchSchema = z.object({
	feed: z.enum(['newest', 'friends', 'popular']).optional(),
})

export const Route = createFileRoute('/_user/learn/$lang/feed')({
	validateSearch: SearchSchema,
	component: DeckFeedPage,
	loader: ({ params: { lang } }) => ({
		titleBar: {
			title: `Requests for ${languages[lang]} Phrases`,
			subtitle: `See what people are learning all across the network`,
			onBackClick: '/learn',
		} as TitleBar,
	}),
})

function DeckFeedPage() {
	const navigate = Route.useNavigate()
	const handleValueChange = useCallback(
		(value: string) => {
			void navigate({
				search: { feed: value as 'newest' | 'friends' | 'popular' },
			})
		},
		[navigate]
	)
	const search = Route.useSearch()
	const activeTab = search.feed ?? 'newest'
	return (
		<main>
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
							<TabsTrigger value="popular" disabled>
								Popular
							</TabsTrigger>
						</TabsList>
						<Link
							to="/learn/$lang/requests/new"
							from={Route.fullPath}
							className={
								`${buttonVariants({
									variant: 'outline',
									size: 'sm',
								})}` as const
							}
						>
							<MessageSquareQuote className="size-3" />
							<span className="me-1">New request</span>
						</Link>
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
		</main>
	)
}

function RecentFeed() {
	const params = Route.useParams()
	const { data: requests, isLoading } = useRequestsLang(params.lang)
	return (
		<div className="space-y-6">
			{isLoading ?
				<p>Loading requests...</p>
			: !requests || requests.length === 0 ?
				<Callout variant="ghost">
					<p className="mb-4 text-lg italic">This feed is empty.</p>
					<Link
						className={buttonVariants({ variant: 'outline-primary' })}
						to="/learn/$lang/requests/new"
						from={Route.fullPath}
					>
						Post a request for a new phrase
					</Link>
				</Callout>
			:	requests.map((request) => (
					<RequestItem key={request.id} request={request} />
				))
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
							className={buttonVariants({ variant: 'outline-primary' })}
							to="/friends"
							from={Route.fullPath}
						>
							Search for a friend
						</Link>
						<Link
							className={buttonVariants({ variant: 'outline-primary' })}
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
						className={buttonVariants({ variant: 'outline-primary' })}
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
		</div>
	)
}
