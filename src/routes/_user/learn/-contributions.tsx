import { MessageCircleHeart, MessageSquareQuote } from 'lucide-react'

import type { uuid } from '@/types/main'
import { Loader } from '@/components/ui/loader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
	useAnyonesPhraseRequests,
	useAnyonesPhrases,
} from '@/hooks/use-contributions'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback } from 'react'
import { buttonVariants } from '@/components/ui/button-variants'
import { Link } from '@tanstack/react-router'
import { RequestItem } from '@/components/requests/request-list-item'
import { CardResultSimple } from '@/components/cards/card-result-simple'
import UserPermalink from '@/components/user-permalink'

export function UserContributions({ uid, lang }: { uid: uuid; lang?: string }) {
	const search = useSearch({ strict: false })
	const navigate = useNavigate()
	const contributionsTab =
		'contributionsTab' in search ?
			(search?.contributionsTab as 'request' | 'phrase' | 'comment')
		:	'request'

	const handleTabChange = useCallback(
		(value: string) => {
			void navigate({
				search: { contributionsTab: value as 'request' | 'phrase' | 'comment' },
			})
		},
		[navigate]
	)

	return (
		<>
			<Tabs
				className="block"
				value={contributionsTab}
				onValueChange={handleTabChange}
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
					<RequestsTab lang={lang} uid={uid} />
				</TabsContent>
				<TabsContent value="phrase">
					<PhrasesTab lang={lang} uid={uid} />
				</TabsContent>
			</Tabs>
		</>
	)
}

function RequestsTab({ lang, uid }: { lang?: string; uid: uuid }) {
	const { data: requests, isLoading } = useAnyonesPhraseRequests(uid, lang)
	return isLoading ?
			<Loader />
		:	<div>
				{isLoading ?
					<p>Loading requests...</p>
				: !requests || requests.length === 0 ?
					<>
						<p className="mb-4 text-lg italic">
							You haven't made any requests yet.
						</p>
						{lang && (
							<Link
								className={buttonVariants({ variant: 'outline-primary' })}
								to="/learn/$lang/requests/new"
								// oxlint-disable-next-line jsx-no-new-object-as-prop
								params={{ lang }}
							>
								<MessageCircleHeart />
								Post a new phrase request
							</Link>
						)}
					</>
				:	<div className="space-y-4">
						{requests.map((request) => (
							<RequestItem key={request.id} request={request} />
						))}
					</div>
				}
			</div>
}
function PhrasesTab(props: { lang?: string; uid: uuid }) {
	const { data: phrases, isLoading } = useAnyonesPhrases(props.uid, props.lang)
	return isLoading ?
			<Loader />
		:	<div>
				<div>
					{isLoading ?
						<p>Loading requests...</p>
					: !phrases || phrases.length === 0 ?
						<>
							<p className="mb-4 text-lg italic">
								You haven't made any requests yet.
							</p>
							{props.lang && (
								<Link
									className={buttonVariants({ variant: 'outline-primary' })}
									to="/learn/$lang/add-phrase"
									// oxlint-disable-next-line jsx-no-new-object-as-prop
									params={{ lang: props.lang }}
								>
									<MessageSquareQuote />
									Add a new phrase
								</Link>
							)}
						</>
					:	<div className="space-y-4">
							{phrases.map((phrase) => (
								<div key={phrase.id} className="space-y-2">
									<UserPermalink
										uid={phrase.added_by}
										username={phrase.profile.username}
										avatar_path={phrase.profile.avatar_path}
										timeValue={phrase.created_at}
										timeLinkParams={props}
										timeLinkTo="/learn/$lang/$id"
									/>
									<CardResultSimple phrase={phrase} />
								</div>
							))}
						</div>
					}
				</div>
			</div>
}
