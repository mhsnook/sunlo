import {
	Logs,
	MessageCircleHeart,
	MessageSquarePlus,
	MessageSquareQuote,
	MessagesSquare,
} from 'lucide-react'

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

type viewTabName = 'request' | 'phrase' | 'answers' | 'comments'

export function UserContributions({ uid, lang }: { uid: uuid; lang?: string }) {
	const search = useSearch({ strict: false })
	const navigate = useNavigate()
	const contributionsTab =
		'contributionsTab' in search ?
			(search?.contributionsTab as viewTabName)
		:	'request'

	const handleTabChange = useCallback(
		(value: string) => {
			void navigate({
				search: {
					contributionsTab: value as viewTabName,
				},
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
					<TabsTrigger value="answers" disabled>
						<MessageSquarePlus size={16} className="me-1" /> Answers
					</TabsTrigger>
					<TabsTrigger value="comments" disabled>
						<MessagesSquare size={16} className="me-1" /> Comments
					</TabsTrigger>
				</TabsList>

				<TabsContent value="request">
					<RequestsTab lang={lang} uid={uid} />
				</TabsContent>
				<TabsContent value="phrase">
					<PhrasesTab lang={lang} uid={uid} />
				</TabsContent>
				<TabsContent value="answers">
					<AnswersTab lang={lang} uid={uid} />
				</TabsContent>
				<TabsContent value="answers">
					<CommentsTab lang={lang} uid={uid} />
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
								This person hasn't made any requests yet.
							</p>
							{props.lang && (
								<Link
									className={buttonVariants()}
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
									<CardResultSimple phrase={phrase} />
								</div>
							))}
						</div>
					}
				</div>
			</div>
}

function AnswersTab(props: { lang?: string; uid: uuid }) {
	// @@TODO change this
	const { data: phrases, isLoading } = useAnyonesPhrases(props.uid, props.lang)
	return isLoading ?
			<Loader />
		:	<div>
				<div>
					{isLoading ?
						<p>Loading answers...</p>
					: !phrases || phrases.length === 0 ?
						<>
							<p className="mb-4 text-lg italic">
								This person hasn't recommended any flashcards to answer
								requests.
							</p>
							{props.lang && (
								<Link
									className={buttonVariants()}
									to="/learn/$lang/feed"
									// oxlint-disable-next-line jsx-no-new-object-as-prop
									params={{ lang: props.lang }}
								>
									<Logs />
									Check out the feed and get involved
								</Link>
							)}
						</>
					:	<div className="space-y-4">
							{phrases.map((phrase) => (
								<div key={phrase.id} className="space-y-2">
									<CardResultSimple phrase={phrase} />
								</div>
							))}
						</div>
					}
				</div>
			</div>
}
function CommentsTab(props: { lang?: string; uid: uuid }) {
	// @@TODO change this
	const { data: phrases, isLoading } = useAnyonesPhrases(props.uid, props.lang)
	return isLoading ?
			<Loader />
		:	<div>
				<div>
					{isLoading ?
						<p>Loading comments...</p>
					: !phrases || phrases.length === 0 ?
						<>
							<p className="mb-4 text-lg italic">
								This person hasn't made any comments yet.
							</p>
							{props.lang && (
								<Link
									className={buttonVariants()}
									to="/learn/$lang/feed"
									// oxlint-disable-next-line jsx-no-new-object-as-prop
									params={{ lang: props.lang }}
								>
									<Logs />
									Check out the feed and get involved
								</Link>
							)}
						</>
					:	<div className="space-y-4">
							{phrases.map((phrase) => (
								<div key={phrase.id} className="space-y-2">
									<CardResultSimple phrase={phrase} />
								</div>
							))}
						</div>
					}
				</div>
			</div>
}
