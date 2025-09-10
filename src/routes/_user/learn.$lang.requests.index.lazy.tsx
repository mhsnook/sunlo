import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Copy, MessageSquareQuote } from 'lucide-react'
import toast from 'react-hot-toast'

import type { PhraseRequest } from '@/types/main'
import supabase from '@/lib/supabase-client'
import { useAuth } from '@/lib/hooks'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Badge, LangBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ago } from '@/lib/dayjs'
import { buttonVariants } from '@/components/ui/button-variants'
import { publicProfileQuery } from '@/lib/use-profile'
import { useLanguagePhrase } from '@/lib/use-language'
import { CardResultSimple } from '@/components/cards/card-result-simple'

export const Route = createLazyFileRoute('/_user/learn/$lang/requests/')({
	component: Page,
})

function usePhraseRequests(lang: string) {
	const { userId } = useAuth()
	return useQuery({
		queryKey: ['user', 'phrase_requests', lang],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('phrase_request')
				.select('*')
				.eq('requester_uid', userId!)
				.eq('lang', lang)
				.order('created_at', { ascending: false })
			if (error) throw error
			return data
		},
		enabled: !!userId,
	})
}

function Page() {
	const { lang } = Route.useParams()
	const { data: requests, isLoading } = usePhraseRequests(lang)

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<div className="flex flex-row justify-between gap-2">
						<span>My Card Requests</span>
						<Link
							to="/learn/$lang/requests/new"
							params={{ lang }}
							className={
								` ${buttonVariants({
									variant: 'outline',
								})} -mt-2` as const
							}
						>
							<MessageSquareQuote className="size-3" />
							<span className="me-1">New request</span>
						</Link>
					</div>
				</CardTitle>
				<CardDescription>
					Here are the card requests you've made for this language.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{isLoading ?
					<p>Loading requests...</p>
				: !requests || requests.length === 0 ?
					<>
						<p className="mb-4 text-lg italic">
							You haven't made any requests yet.
						</p>
						<Link
							className={buttonVariants({ variant: 'outline-primary' })}
							to="/learn/$lang/requests/new"
							params={{ lang }}
						>
							Post a new card request
						</Link>
					</>
				:	<div className="space-y-4">
						{requests.map((request) => (
							<RequestItem key={request.id} request={request} />
						))}
					</div>
				}
			</CardContent>
		</Card>
	)
}

function RequestItem({ request }: { request: PhraseRequest }) {
	const shareUrl = `${window.location.origin}/learn/${request.lang}/requests/${request.id}`
	const { data: profile1 } = useQuery(
		publicProfileQuery(request.requester_uid!)
	)
	const { data: profile2 } = useQuery(
		publicProfileQuery(request.fulfilled_by_uid!)
	)
	const { data: phrase } = useLanguagePhrase(
		request.fulfilled_phrase_id,
		request.lang
	)

	const copyToClipboard = () => {
		void navigator.clipboard.writeText(shareUrl)
		toast.success('Link copied to clipboard!')
	}

	return (
		<div className="flex flex-col gap-2 rounded-lg border p-4">
			<div className="flex items-center justify-between">
				<Link
					to="/learn/$lang/requests/$id"
					params={{ lang: request.lang, id: request.id }}
					className="hover:s-link text-muted-foreground text-sm"
				>
					<span>Requested {ago(request.created_at)} </span>
					{profile1 && <span>by {profile1.username}</span>}
				</Link>
				<Badge
					variant={request.status === 'fulfilled' ? 'default' : 'secondary'}
				>
					{request.status}
				</Badge>
			</div>
			<div className="flex flex-row items-center gap-2">
				<LangBadge lang={request.lang} />
				<p className="text-lg">{request.prompt}</p>
			</div>
			{request.status === 'fulfilled' && (
				<div className="mt-4 space-y-2">
					<p className="text-muted-foreground text-sm">
						Answered {ago(request.fulfilled_at)} by {profile2?.username}
					</p>
					{phrase && <CardResultSimple phrase={phrase} />}
				</div>
			)}
			{request.status === 'pending' && (
				<div className="bg-muted flex items-center gap-2 rounded-md p-2">
					<input
						type="text"
						readOnly
						value={shareUrl}
						className="flex-grow bg-transparent text-sm"
					/>
					<Button size="sm" variant="ghost" onClick={copyToClipboard}>
						<Copy className="h-4 w-4" />
					</Button>
				</div>
			)}
		</div>
	)
}
