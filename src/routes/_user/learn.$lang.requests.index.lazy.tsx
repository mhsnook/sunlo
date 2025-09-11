import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { MessageSquareQuote } from 'lucide-react'

import supabase from '@/lib/supabase-client'
import { useAuth } from '@/lib/hooks'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button-variants'
import { RequestItem } from '@/components/requests/request-list-item'

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
