import { useCallback } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { MessageCircleHeart, MessageSquareQuote } from 'lucide-react'
import * as z from 'zod'

import { buttonVariants } from '@/components/ui/button-variants'
import { RequestItem } from '@/components/requests/request-list-item'
import { useAllMyPhraseRequestsLang } from '@/hooks/use-requests'
import { useAllMyPhrasesLang } from '@/hooks/use-language'
import { Tabs, TabsTrigger, TabsContent, TabsList } from '@/components/ui/tabs'
import { Loader } from '@/components/ui/loader'
import languages from '@/lib/languages'
import { CardResultSimple } from '@/components/cards/card-result-simple'
import { phraseRequestsCollection } from '@/lib/collections'

const Search = z.object({
	type: z.enum(['request', 'phrase', 'comment']).optional(),
})

export const Route = createFileRoute('/_user/learn/$lang/contributions')({
	validateSearch: Search,
	component: Page,
	loader: async ({ params: { lang } }) => {
		await phraseRequestsCollection.preload()
		return {
			titleBar: {
				title: `Contributions to the ${languages[lang]} Library`,
				subtitle: '',
			},
		}
	},
})

function Page() {
	const params = Route.useParams()
	const navigate = Route.useNavigate()
	const search = Route.useSearch()
	const activeTab = search?.type ?? 'request'

	const handleValueChange = useCallback(
		(value: string) => {
			void navigate({
				search: { type: value as 'request' | 'phrase' | 'comment' },
			})
		},
		[navigate]
	)

	return (
		<>
			<Tabs
				className="block"
				value={activeTab}
				onValueChange={handleValueChange}
			>
				<TabsList className="mt-1 text-lg">
					<TabsTrigger value="request">
						<MessageCircleHeart size={16} className="me-1" /> Requests
					</TabsTrigger>
					<TabsTrigger value="phrase">
						<MessageSquareQuote size={16} className="me-1" /> Phrases
					</TabsTrigger>
				</TabsList>

				<TabsContent value="request">
					<RequestsTab lang={params.lang} />
				</TabsContent>
				<TabsContent value="phrase">
					<PhrasesTab lang={params.lang} />
				</TabsContent>
			</Tabs>
		</>
	)
}

function RequestsTab({ lang }: { lang: string }) {
	const { data: requests, isLoading } = useAllMyPhraseRequestsLang(lang)
	return isLoading ?
			<Loader />
		:	<div>
				<div className="flex flex-row items-center justify-between gap-2">
					<h2 className="h2">Requests You Posted</h2>
					<Link
						to="/learn/$lang/requests/new"
						from={Route.fullPath}
						className={
							`${buttonVariants({
								variant: 'outline',
							})}` as const
						}
					>
						<MessageCircleHeart className="size-3" />
						<span className="me-1">New request</span>
					</Link>
				</div>
				<div>
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
								from={Route.fullPath}
							>
								<MessageCircleHeart />
								Post a new phrase request
							</Link>
						</>
					:	<div className="border-border/50 bg-background rounded border p-1">
							{requests.map((request) => (
								<RequestItem key={request.id} request={request} />
							))}
						</div>
					}
				</div>
			</div>
}
function PhrasesTab({ lang }: { lang: string }) {
	const { data: phrases, isLoading } = useAllMyPhrasesLang(lang)
	return isLoading ?
			<Loader />
		:	<div>
				<div className="flex flex-row items-center justify-between gap-2">
					<h2 className="h2">Phrases You Authored</h2>
					<Link
						to="/learn/$lang/add-phrase"
						from={Route.fullPath}
						className={
							`${buttonVariants({
								variant: 'outline',
							})}` as const
						}
					>
						<MessageSquareQuote className="size-3" />
						<span className="me-1">New Phrase</span>
					</Link>
				</div>
				<div>
					{isLoading ?
						<p>Loading requests...</p>
					: !phrases || phrases.length === 0 ?
						<>
							<p className="mb-4 text-lg italic">
								You haven't made any requests yet.
							</p>
							<Link
								className={buttonVariants({ variant: 'outline-primary' })}
								to="/learn/$lang/add-phrase"
								from={Route.fullPath}
							>
								<MessageSquareQuote />
								Add a new phrase
							</Link>
						</>
					:	<div className="space-y-4">
							{phrases.map((phrase) => (
								<CardResultSimple key={phrase.id} phrase={phrase} />
							))}
						</div>
					}
				</div>
			</div>
}
