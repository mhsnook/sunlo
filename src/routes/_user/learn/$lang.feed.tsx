import { createFileRoute, Link } from '@tanstack/react-router'

import { buttonVariants } from '@/components/ui/button-variants'

import { useRequestsLang } from '@/hooks/use-requests'
import { MessageSquareQuote } from 'lucide-react'
import { RequestItem } from '@/components/requests/request-list-item'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TitleBar } from '@/types/main'
import languages from '@/lib/languages'

export const Route = createFileRoute('/_user/learn/$lang/feed')({
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
	const params = Route.useParams()
	const { data: requests, isLoading } = useRequestsLang(params.lang)

	return (
		<main>
			<div className="mb-2 flex flex-row items-center justify-between gap-2">
				<Tabs defaultValue="newest">
					<TabsList>
						<TabsTrigger value="newest">Newest</TabsTrigger>
						<TabsTrigger value="popular" disabled>
							Popular
						</TabsTrigger>
					</TabsList>
				</Tabs>
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

			<div>
				{isLoading ?
					<p>Loading requests...</p>
				: !requests || requests.length === 0 ?
					<>
						<p className="mb-4 text-lg italic">This feed is empty.</p>
						<Link
							className={buttonVariants({ variant: 'outline-primary' })}
							to="/learn/$lang/requests/new"
							from={Route.fullPath}
						>
							Post a new card request
						</Link>
					</>
				:	<div className="bg-background rounded-sm border p-1">
						{requests.map((request) => (
							<RequestItem key={request.id} request={request} />
						))}
					</div>
				}
			</div>
		</main>
	)
}
