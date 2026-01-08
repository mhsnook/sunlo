import { useCallback } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import {
	Disc3,
	Logs,
	MessageCircleHeart,
	MessageSquareQuote,
} from 'lucide-react'

import { buttonVariants } from '@/components/ui/button-variants'
import type { uuid } from '@/types/main'
import { Loader } from '@/components/ui/loader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
	useAnyonesPhraseRequests,
	useAnyonesPhrases,
} from '@/hooks/use-contributions'

import { RequestItem } from '@/components/requests/request-list-item'
import { CardResultSimple } from '@/components/cards/card-result-simple'
import { useAnyonesPlaylists } from '@/hooks/use-playlists'
import { PlaylistItem } from '@/components/playlists/playlist-list-item'
import languages from '@/lib/languages'
import Callout from '@/components/ui/callout'
import { PlusMenu } from '@/components/plus-menu'

type viewTabName = 'requests' | 'phrases' | 'playlists' | 'answers' | 'comments'

export function UserContributions({ uid, lang }: { uid: uuid; lang?: string }) {
	const search = useSearch({ strict: false })
	const navigate = useNavigate()
	const contributionsTab =
		'contributionsTab' in search ?
			(search?.contributionsTab as viewTabName)
		:	'requests'

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
				<div className="flex w-full flex-row items-center justify-between gap-2">
					<TabsList className="mt-1 text-lg">
						<TabsTrigger value="requests">
							<MessageCircleHeart size={16} className="me-1" /> Requests
						</TabsTrigger>
						<TabsTrigger value="phrases">
							<MessageSquareQuote size={16} className="me-1" /> Phrases
						</TabsTrigger>
						<TabsTrigger value="playlists">
							<Disc3 size={16} className="me-1" /> Playlists
						</TabsTrigger>
						{/*<TabsTrigger value="answers" disabled>
							<MessageSquarePlus size={16} className="me-1" /> Answers
						</TabsTrigger>
						<TabsTrigger value="comments" disabled>
							<MessagesSquare size={16} className="me-1" /> Comments
						</TabsTrigger>*/}
					</TabsList>
					{lang && (
						<div className="shrink-0">
							<PlusMenu lang={lang} />
						</div>
					)}
				</div>

				<TabsContent value="requests">
					<RequestsTab lang={lang} uid={uid} />
				</TabsContent>
				<TabsContent value="phrases">
					<PhrasesTab lang={lang} uid={uid} />
				</TabsContent>
				<TabsContent value="playlists">
					<PlaylistsTab lang={lang} uid={uid} />
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
	return (
		isLoading ? <Loader />
		: !requests || requests.length === 0 ?
			<Callout variant="ghost">
				<p className="text-lg">You haven't made any requests yet.</p>
				{lang ?
					<Link
						className={buttonVariants({ variant: 'outline-primary' }) + ' mt-4'}
						to="/learn/$lang/requests/new"
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						params={{ lang }}
					>
						<MessageCircleHeart />
						Post a new phrase request
					</Link>
				:	<Link
						className={buttonVariants({ variant: 'outline-primary' }) + ' mt-4'}
						to="/learn"
					>
						Choose a language deck to make a request for
					</Link>
				}
			</Callout>
		:	<div className="space-y-4">
				{requests.map((request) => (
					<RequestItem key={request.id} request={request} />
				))}
			</div>
	)
}

function PhrasesTab(props: { lang?: string; uid: uuid }) {
	const { data: phrases, isLoading } = useAnyonesPhrases(props.uid, props.lang)
	return (
		isLoading ? <Loader />
		: !phrases || phrases.length === 0 ?
			<Callout variant="ghost">
				<p className="text-lg">This person hasn't made any requests yet.</p>
				{props.lang && (
					<Link
						className={buttonVariants({ variant: 'outline-primary' }) + ' mt-4'}
						to="/learn/$lang/add-phrase"
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						params={{ lang: props.lang }}
					>
						<MessageSquareQuote />
						Add a new phrase
					</Link>
				)}
			</Callout>
		:	<div className="space-y-4">
				{phrases.map((phrase) => (
					<div key={phrase.id} className="space-y-2">
						<CardResultSimple phrase={phrase} />
					</div>
				))}
			</div>
	)
}

function PlaylistsTab(props: { lang?: string; uid: uuid }) {
	const { data: playlists, isLoading } = useAnyonesPlaylists(
		props.uid,
		props.lang
	)
	const navigate = useNavigate()

	return (
		isLoading ? <Loader />
		: !playlists || playlists.length === 0 ?
			<Callout variant="ghost">
				<p className="text-lg">This user hasn't made any playlists yet.</p>
				{props.lang ?
					<Link
						className={buttonVariants({ variant: 'outline-primary' }) + ' mt-4'}
						to="/learn/$lang/playlists"
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						params={{ lang: props.lang }}
					>
						<Disc3 />
						Browse other {languages[props.lang]} playlists
					</Link>
				:	<Link
						className={buttonVariants({ variant: 'outline-primary' }) + ' mt-4'}
						to="/learn"
						// oxlint-disable-next-line jsx-no-new-object-as-prop
					>
						Choose a language deck to make a playlist for
					</Link>
				}
			</Callout>
		:	<div className="space-y-4">
				{playlists.map((playlist) => (
					// oxlint-disable-next-line click-events-have-key-events
					<div
						key={playlist.id}
						className="cursor-pointer hover:shadow"
						// oxlint-disable-next-line jsx-no-new-function-as-prop
						onClick={(e) => {
							const target = e.target as HTMLElement
							if (!e.currentTarget.contains(target)) return
							if (target.closest('button, a, input')) return
							void navigate({
								to: '/learn/$lang/playlists/$playlistId',
								params: { lang: playlist.lang, playlistId: playlist.id },
							})
						}}
					>
						<PlaylistItem playlist={playlist} />
					</div>
				))}
			</div>
	)
}

function AnswersTab(props: { lang?: string; uid: uuid }) {
	// @@TODO change this
	const { data: phrases, isLoading } = useAnyonesPhrases(props.uid, props.lang)
	return (
		isLoading ? <Loader />
		: !phrases || phrases.length === 0 ?
			<Callout variant="ghost">
				<p className="text-lg">
					This user hasn't recommended any flashcards to answer requests.
				</p>
				{props.lang && (
					<Link
						className={buttonVariants({ variant: 'outline-primary' }) + ' mt-4'}
						to="/learn/$lang/feed"
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						params={{ lang: props.lang }}
					>
						<Logs />
						Check out the feed and get involved
					</Link>
				)}
			</Callout>
		:	<div className="space-y-4">
				{phrases.map((phrase) => (
					<div key={phrase.id} className="space-y-2">
						<CardResultSimple phrase={phrase} />
					</div>
				))}
			</div>
	)
}

function CommentsTab(props: { lang?: string; uid: uuid }) {
	// @@TODO change this
	const { data: phrases, isLoading } = useAnyonesPhrases(props.uid, props.lang)
	return (
		isLoading ? <Loader />
		: !phrases || phrases.length === 0 ?
			<Callout variant="ghost">
				<p className="text-lg">This user hasn't made any comments yet.</p>
				{props.lang && (
					<Link
						className={buttonVariants({ variant: 'outline-primary' }) + ' mt-4'}
						to="/learn/$lang/feed"
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						params={{ lang: props.lang }}
					>
						<Logs />
						Check out the feed and get involved
					</Link>
				)}
			</Callout>
		:	<div className="space-y-4">
				{phrases.map((phrase) => (
					<div key={phrase.id} className="space-y-2">
						<CardResultSimple phrase={phrase} />
					</div>
				))}
			</div>
	)
}
