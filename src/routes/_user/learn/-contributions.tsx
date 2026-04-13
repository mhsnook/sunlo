import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import {
	Check,
	ListFilter,
	ListMusic,
	Logs,
	MessageCircleHeart,
	MessageSquareQuote,
	MessagesSquare,
	type LucideIcon,
} from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { uuid } from '@/types/main'
import { Loader } from '@/components/ui/loader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
	useAnyonesPhraseRequests,
	useAnyonesPhrases,
	useAnyonesComments,
} from '@/features/contributions/hooks'

import { RequestItem } from '@/components/requests/request-list-item'
import { CardResultSimple } from '@/components/cards/card-result-simple'
import { useAnyonesPlaylists } from '@/features/playlists/hooks'
import { PlaylistItem } from '@/components/playlists/playlist-list-item'
import languages from '@/lib/languages'
import Callout from '@/components/ui/callout'
import { PlusMenu } from '@/components/plus-menu'
import { UidPermalinkInline } from '@/components/card-pieces/user-permalink'
import { Markdown } from '@/components/my-markdown'
import { usePhrasesFromComment } from '@/features/comments/hooks'
import type { RequestCommentType } from '@/features/comments/schemas'
import type { PhraseRequestType } from '@/features/requests/schemas'

type viewTabName = 'requests' | 'phrases' | 'playlists' | 'answers' | 'comments'

const tabOptions: Array<{
	value: viewTabName
	label: string
	icon: LucideIcon
}> = [
	{ value: 'requests', label: 'Requests', icon: MessageCircleHeart },
	{ value: 'phrases', label: 'Phrases', icon: MessageSquareQuote },
	{ value: 'playlists', label: 'Playlists', icon: ListMusic },
	{ value: 'comments', label: 'Comments', icon: MessagesSquare },
]

export function UserContributions({ uid, lang }: { uid: uuid; lang?: string }) {
	const search = useSearch({ strict: false })
	const navigate = useNavigate()
	const contributionsTab =
		'contributionsTab' in search ?
			(search?.contributionsTab as viewTabName)
		:	'requests'

	const handleTabChange = (value: string) => {
		void navigate({
			search: ((prev: Record<string, unknown>) => ({
				...prev,
				contributionsTab: value as viewTabName,
			})) as never,
		})
	}

	const activeLabel =
		tabOptions.find((t) => t.value === contributionsTab)?.label ?? 'Requests'

	return (
		<>
			<Tabs
				className="block"
				value={contributionsTab}
				onValueChange={handleTabChange}
			>
				<div className="@container flex w-full flex-row items-center justify-between gap-2">
					<TabsList className="mt-1 hidden text-lg @md:inline-flex">
						{tabOptions.map(({ value, label, icon: Icon }) => (
							<TabsTrigger
								key={value}
								data-testid={`contributions-tab--${value}`}
								value={value}
							>
								<Icon size={16} className="me-1" /> {label}
							</TabsTrigger>
						))}
					</TabsList>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								data-testid="contributions-filter-button"
								className="text-muted-foreground gap-1 text-xs @md:hidden"
							>
								<ListFilter className="size-3.5" />
								{activeLabel}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start">
							<DropdownMenuLabel>Show content type</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{tabOptions.map(({ value, label }) => (
								<DropdownMenuItem
									key={value}
									onClick={() => handleTabChange(value)}
								>
									<Check
										className={
											contributionsTab === value ? 'opacity-100' : 'opacity-0'
										}
									/>
									{label}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>

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
				<TabsContent value="comments">
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
						className={buttonVariants({ variant: 'soft' }) + ' mt-4'}
						to="/learn/$lang/requests/new"
						params={{ lang }}
					>
						<MessageCircleHeart />
						Post a new phrase request
					</Link>
				:	<Link
						className={buttonVariants({ variant: 'soft' }) + ' mt-4'}
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
						className={buttonVariants({ variant: 'soft' }) + ' mt-4'}
						to="/learn/$lang/phrases/new"
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
						className={buttonVariants({ variant: 'soft' }) + ' mt-4'}
						to="/learn/$lang/playlists"
						params={{ lang: props.lang }}
					>
						<ListMusic />
						Browse other {languages[props.lang]} playlists
					</Link>
				:	<Link
						className={buttonVariants({ variant: 'soft' }) + ' mt-4'}
						to="/learn"
					>
						Choose a language deck to make a playlist for
					</Link>
				}
			</Callout>
		:	<div className="space-y-4">
				{playlists.map((playlist) => (
					// oxlint-disable-next-line click-events-have-key-events
					<div
						role="link"
						tabIndex={0}
						key={playlist.id}
						className="cursor-pointer hover:shadow"
						onClick={(e) => {
							const target = e.target as HTMLElement
							if (!e.currentTarget.contains(target)) return
							if (target.closest('button, a, input')) return
							void navigate({
								to: '/learn/$lang/playlists/$playlistId',
								params: { lang: playlist.lang, playlistId: playlist.id },
							})
						}}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								void navigate({
									to: '/learn/$lang/playlists/$playlistId',
									params: { lang: playlist.lang, playlistId: playlist.id },
								})
							}
						}}
					>
						<PlaylistItem playlist={playlist} compact />
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
						className={buttonVariants({ variant: 'soft' }) + ' mt-4'}
						to="/learn/$lang/feed"
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
	const { data: comments, isLoading } = useAnyonesComments(
		props.uid,
		props.lang
	)
	return (
		isLoading ? <Loader />
		: !comments || comments.length === 0 ?
			<Callout variant="ghost">
				<p className="text-lg">This user hasn't made any comments yet.</p>
				{props.lang && (
					<Link
						className={buttonVariants({ variant: 'soft' }) + ' mt-4'}
						to="/learn/$lang/feed"
						params={{ lang: props.lang }}
					>
						<Logs />
						Check out the feed and get involved
					</Link>
				)}
			</Callout>
		:	<div className="space-y-4">
				{comments.map(({ comment, request }) => (
					<CommentCardWithPhrases
						key={comment.id}
						comment={comment}
						request={request}
					/>
				))}
			</div>
	)
}

function CommentCardWithPhrases({
	comment,
	request,
}: {
	comment: RequestCommentType
	request: PhraseRequestType
}) {
	const { data: phrases } = usePhrasesFromComment(comment.id)

	return (
		<div className="bg-card space-y-2 rounded p-4 shadow-sm">
			<UidPermalinkInline
				uid={comment.uid}
				timeValue={comment.created_at}
				action={comment.parent_comment_id ? 'replied' : 'commented'}
				timeLinkParams={{ id: request.id, lang: request.lang }}
				timeLinkSearch={{ focus: comment.id }}
				timeLinkTo="/learn/$lang/requests/$id"
			/>
			{comment.content && (
				<div className="ms-8">
					<Markdown>{comment.content}</Markdown>
				</div>
			)}
			{phrases && phrases.length > 0 && (
				<div className="ms-8 mt-1 space-y-2">
					{phrases.map(({ phrase }) => (
						<CardResultSimple key={phrase.id} phrase={phrase} />
					))}
				</div>
			)}
		</div>
	)
}
