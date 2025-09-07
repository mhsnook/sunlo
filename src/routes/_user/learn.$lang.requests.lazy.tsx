import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Copy } from 'lucide-react'
import toast from 'react-hot-toast'

import supabase from '@/lib/supabase-client'
import { useAuth } from '@/lib/hooks'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ago } from '@/lib/dayjs'
import { Database } from '@/types/supabase'
import { buttonVariants } from '@/components/ui/button-variants'

export const Route = createLazyFileRoute('/_user/learn/$lang/requests')({
	component: Page,
})

type PhraseRequest = Database['public']['Tables']['phrase_request']['Row']

function usePhraseRequests(lang: string) {
	const { userId } = useAuth()
	return useQuery({
		queryKey: ['phrase_requests', lang, userId],
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
				<CardTitle>My Card Requests</CardTitle>
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
							to="/learn/$lang/request-card"
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
	const shareUrl = `${window.location.origin}/request-card/${request.id}`

	const copyToClipboard = () => {
		void navigator.clipboard.writeText(shareUrl)
		toast.success('Link copied to clipboard!')
	}

	return (
		<div className="flex flex-col gap-2 rounded-lg border p-4">
			<div className="flex items-center justify-between">
				<span className="text-muted-foreground text-sm">
					{ago(request.created_at)}
				</span>
				<Badge
					variant={request.status === 'fulfilled' ? 'default' : 'secondary'}
				>
					{request.status}
				</Badge>
			</div>
			<p className="text-lg">{request.prompt}</p>
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
