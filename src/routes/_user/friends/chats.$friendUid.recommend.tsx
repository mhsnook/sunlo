import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { eq, useLiveQuery } from '@tanstack/react-db'
import toast from 'react-hot-toast'
import { useDebounce } from '@uidotdev/usehooks'
import { useInView } from 'react-intersection-observer'
import {
	ListMusic,
	MessageCircleHeart,
	Search,
	Send,
	WalletCards,
	X,
} from 'lucide-react'
import * as z from 'zod'

import type { uuid } from '@/types/main'
import type { TablesInsert } from '@/types/supabase'
import type { PhraseFullFilteredType } from '@/lib/schemas'
import supabase from '@/lib/supabase-client'
import { useUserId } from '@/lib/use-auth'
import {
	phrasePlaylistsCollection,
	phraseRequestsCollection,
} from '@/lib/collections'

import { Input } from '@/components/ui/input'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { LangBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SelectOneOfYourLanguages } from '@/components/fields/select-one-of-your-languages'
import PermalinkButton from '@/components/permalink-button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSmartSearch } from '@/hooks/use-smart-search'
import Callout from '@/components/ui/callout'
import { Loader } from '@/components/ui/loader'
import { ScrollArea } from '@/components/ui/scroll-area'
import languages from '@/lib/languages'

const RecommendSearchSchema = z.object({
	type: z.enum(['phrase', 'request', 'playlist']).default('phrase'),
})

export const Route = createFileRoute(
	'/_user/friends/chats/$friendUid/recommend'
)({
	validateSearch: RecommendSearchSchema,
	component: RouteComponent,
})

function RouteComponent() {
	const params = Route.useParams()
	const { type } = Route.useSearch()
	const userId = useUserId()
	const navigate = useNavigate({ from: Route.fullPath })

	const [lang, setLang] = useState<string>('')
	const [searchTerm, setSearchTerm] = useState('')

	const handleClose = () => {
		void navigate({
			to: '/friends/chats/$friendUid',
			params,
		})
	}

	const handleTabChange = (value: string) => {
		void navigate({
			search: { type: value as 'phrase' | 'request' | 'playlist' },
			replace: true,
		})
	}

	const sendMessageMutation = useMutation({
		mutationFn: async (newMessage: TablesInsert<'chat_message'>) => {
			const { error } = await supabase.from('chat_message').insert(newMessage)
			if (error) throw error
		},
		onSuccess: () => {
			void navigate({ to: '/friends/chats/$friendUid', params })
			toast.success('Sent!')
		},
		onError: (error) => {
			toast.error(`Failed to send: ${error.message}`)
			console.log('Error', error)
		},
	})

	const handleSendPhrase = (phraseId: uuid, phraseLang: string) => {
		if (!userId) return
		void sendMessageMutation.mutate({
			sender_uid: userId,
			recipient_uid: params.friendUid,
			phrase_id: phraseId,
			lang: phraseLang,
			message_type: 'recommendation',
		})
	}

	const handleSendRequest = (requestId: uuid, requestLang: string) => {
		if (!userId) return
		void sendMessageMutation.mutate({
			sender_uid: userId,
			recipient_uid: params.friendUid,
			request_id: requestId,
			lang: requestLang,
			message_type: 'request',
		})
	}

	const handleSendPlaylist = (playlistId: uuid, playlistLang: string) => {
		if (!userId) return
		void sendMessageMutation.mutate({
			sender_uid: userId,
			recipient_uid: params.friendUid,
			playlist_id: playlistId,
			lang: playlistLang,
			message_type: 'playlist',
		})
	}

	return (
		<Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
			<DialogContent className="flex max-h-[95vh] flex-col overflow-hidden">
				<DialogHeader>
					<DialogTitle>Send to friend</DialogTitle>
					<DialogDescription className="sr-only">
						Search for content to send to your friend
					</DialogDescription>
				</DialogHeader>
				<Tabs
					value={type}
					onValueChange={handleTabChange}
					className="flex min-h-0 flex-1 flex-col"
				>
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="phrase" className="gap-1.5">
							<WalletCards className="size-4" />
							<span className="hidden @sm:inline">Phrase</span>
						</TabsTrigger>
						<TabsTrigger value="request" className="gap-1.5">
							<MessageCircleHeart className="size-4" />
							<span className="hidden @sm:inline">Request</span>
						</TabsTrigger>
						<TabsTrigger value="playlist" className="gap-1.5">
							<ListMusic className="size-4" />
							<span className="hidden @sm:inline">Playlist</span>
						</TabsTrigger>
					</TabsList>

					<div className="flex flex-col gap-4 py-4">
						<Label>
							<p className="mb-2">Language filter</p>
							<SelectOneOfYourLanguages value={lang} setValue={setLang} />
						</Label>
						<Label>
							<p className="mb-2">Search</p>
							<div className="relative">
								<Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
								<Input
									placeholder="Search..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="ps-9 pe-9"
								/>
								{searchTerm && (
									<button
										type="button"
										onClick={() => setSearchTerm('')}
										className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
									>
										<X className="size-4" />
									</button>
								)}
							</div>
						</Label>
					</div>

					<TabsContent
						value="phrase"
						className="mt-0 min-h-0 flex-1 overflow-hidden"
					>
						<PhraseSearchResults
							lang={lang}
							query={searchTerm}
							onSelect={handleSendPhrase}
							isPending={sendMessageMutation.isPending}
						/>
					</TabsContent>

					<TabsContent
						value="request"
						className="mt-0 min-h-0 flex-1 overflow-hidden"
					>
						<RequestSearchResults
							lang={lang}
							query={searchTerm}
							onSelect={handleSendRequest}
							isPending={sendMessageMutation.isPending}
						/>
					</TabsContent>

					<TabsContent
						value="playlist"
						className="mt-0 min-h-0 flex-1 overflow-hidden"
					>
						<PlaylistSearchResults
							lang={lang}
							query={searchTerm}
							onSelect={handleSendPlaylist}
							isPending={sendMessageMutation.isPending}
						/>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	)
}

// Phrase search using smart trigram search
function PhraseSearchResults({
	lang,
	query,
	onSelect,
	isPending,
}: {
	lang: string
	query: string
	onSelect: (id: uuid, lang: string) => void
	isPending: boolean
}) {
	const {
		data: results,
		isLoading,
		isEmpty,
		hasNextPage,
		fetchNextPage,
		isFetchingNextPage,
	} = useSmartSearch(lang, query, 'relevance')

	// Infinite scroll trigger
	const { ref: loadMoreRef, inView } = useInView({
		threshold: 0,
		rootMargin: '100px',
	})

	useEffect(() => {
		if (inView && hasNextPage && !isFetchingNextPage) {
			void fetchNextPage()
		}
	}, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

	if (!query || query.length < 2) {
		return (
			<Callout variant="ghost" className="my-4">
				Enter at least 2 characters to search
			</Callout>
		)
	}

	if (isLoading) {
		return <Loader className="my-8" />
	}

	if (isEmpty) {
		return (
			<Callout variant="ghost" className="my-4">
				No phrases found
			</Callout>
		)
	}

	return (
		<ScrollArea className="h-full">
			<div className="flex flex-col gap-2 pb-4">
				<p className="text-muted-foreground text-xs italic">
					{results.length} result{results.length !== 1 ? 's' : ''}
				</p>
				{results.map((phrase) => (
					<PhraseResultItem
						key={phrase.id}
						phrase={phrase}
						onSelect={onSelect}
						isPending={isPending}
					/>
				))}
				{hasNextPage && (
					<div ref={loadMoreRef} className="flex justify-center py-2">
						{isFetchingNextPage && <Loader />}
					</div>
				)}
			</div>
		</ScrollArea>
	)
}

function PhraseResultItem({
	phrase,
	onSelect,
	isPending,
}: {
	phrase: PhraseFullFilteredType
	onSelect: (id: uuid, lang: string) => void
	isPending: boolean
}) {
	return (
		<div className="flex items-start justify-between gap-2 rounded-md border p-3">
			<LangBadge lang={phrase.lang} className="my-1" />
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium">{phrase.text}</p>
				{phrase.translations?.[0] && (
					<p className="text-muted-foreground truncate text-xs">
						{phrase.translations[0].text}
					</p>
				)}
			</div>
			<PermalinkButton
				size="icon"
				variant="ghost"
				from={Route.fullPath}
				text=""
				to="/learn/$lang/phrases/$id"
				params={{ lang: phrase.lang, id: phrase.id }}
			/>
			<Button
				size="icon"
				onClick={() => onSelect(phrase.id, phrase.lang)}
				disabled={isPending}
			>
				<Send className="-ms-0.5 mt-0.5 size-4" />
			</Button>
		</div>
	)
}

// Request search using client-side filtering
function RequestSearchResults({
	lang,
	query,
	onSelect,
	isPending,
}: {
	lang: string
	query: string
	onSelect: (id: uuid, lang: string) => void
	isPending: boolean
}) {
	const debouncedQuery = useDebounce(query, 300)
	const lowerQuery = debouncedQuery.toLowerCase().trim()

	const { data: allRequests, isLoading } = useLiveQuery((q) =>
		q
			.from({ req: phraseRequestsCollection })
			.where(({ req }) => eq(req.deleted, false))
	)

	const filteredRequests = useMemo(() => {
		if (!allRequests) return []
		return allRequests
			.filter((req) => {
				// Language filter
				if (lang && req.lang !== lang) return false
				// Text search
				if (lowerQuery) {
					return req.prompt.toLowerCase().includes(lowerQuery)
				}
				return true
			})
			.sort((a, b) => (b.upvote_count ?? 0) - (a.upvote_count ?? 0))
			.slice(0, 20)
	}, [allRequests, lang, lowerQuery])

	if (isLoading) {
		return <Loader className="my-8" />
	}

	if (!query && !lang) {
		return (
			<Callout variant="ghost" className="my-4">
				Enter search terms or select a language
			</Callout>
		)
	}

	if (filteredRequests.length === 0) {
		return (
			<Callout variant="ghost" className="my-4">
				No requests found
			</Callout>
		)
	}

	return (
		<ScrollArea className="h-full">
			<div className="flex flex-col gap-2 pb-4">
				<p className="text-muted-foreground text-xs italic">
					{filteredRequests.length} result
					{filteredRequests.length !== 1 ? 's' : ''}
				</p>
				{filteredRequests.map((request) => (
					<div
						key={request.id}
						className="flex items-start justify-between gap-2 rounded-md border p-3"
					>
						<LangBadge lang={request.lang} className="my-1" />
						<div className="min-w-0 flex-1">
							<p className="line-clamp-2 text-sm font-medium">
								{request.prompt}
							</p>
							<p className="text-muted-foreground text-xs">
								{languages[request.lang]} &middot; {request.upvote_count ?? 0}{' '}
								upvotes
							</p>
						</div>
						<PermalinkButton
							size="icon"
							variant="ghost"
							from={Route.fullPath}
							text=""
							to="/learn/$lang/requests/$id"
							params={{ lang: request.lang, id: request.id }}
						/>
						<Button
							size="icon"
							onClick={() => onSelect(request.id, request.lang)}
							disabled={isPending}
						>
							<Send className="-ms-0.5 mt-0.5 size-4" />
						</Button>
					</div>
				))}
			</div>
		</ScrollArea>
	)
}

// Playlist search using client-side filtering
function PlaylistSearchResults({
	lang,
	query,
	onSelect,
	isPending,
}: {
	lang: string
	query: string
	onSelect: (id: uuid, lang: string) => void
	isPending: boolean
}) {
	const debouncedQuery = useDebounce(query, 300)
	const lowerQuery = debouncedQuery.toLowerCase().trim()

	const { data: allPlaylists, isLoading } = useLiveQuery((q) =>
		q
			.from({ playlist: phrasePlaylistsCollection })
			.where(({ playlist }) => eq(playlist.deleted, false))
	)

	const filteredPlaylists = useMemo(() => {
		if (!allPlaylists) return []
		return allPlaylists
			.filter((playlist) => {
				// Language filter
				if (lang && playlist.lang !== lang) return false
				// Text search
				if (lowerQuery) {
					const searchText = [playlist.title, playlist.description ?? '']
						.join(' ')
						.toLowerCase()
					return searchText.includes(lowerQuery)
				}
				return true
			})
			.sort((a, b) => (b.upvote_count ?? 0) - (a.upvote_count ?? 0))
			.slice(0, 20)
	}, [allPlaylists, lang, lowerQuery])

	if (isLoading) {
		return <Loader className="my-8" />
	}

	if (!query && !lang) {
		return (
			<Callout variant="ghost" className="my-4">
				Enter search terms or select a language
			</Callout>
		)
	}

	if (filteredPlaylists.length === 0) {
		return (
			<Callout variant="ghost" className="my-4">
				No playlists found
			</Callout>
		)
	}

	return (
		<ScrollArea className="h-full">
			<div className="flex flex-col gap-2 pb-4">
				<p className="text-muted-foreground text-xs italic">
					{filteredPlaylists.length} result
					{filteredPlaylists.length !== 1 ? 's' : ''}
				</p>
				{filteredPlaylists.map((playlist) => (
					<div
						key={playlist.id}
						className="flex items-start justify-between gap-2 rounded-md border p-3"
					>
						<LangBadge lang={playlist.lang} className="my-1" />
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium">{playlist.title}</p>
							{playlist.description && (
								<p className="text-muted-foreground line-clamp-1 text-xs">
									{playlist.description}
								</p>
							)}
							<p className="text-muted-foreground text-xs">
								{languages[playlist.lang]} &middot; {playlist.upvote_count ?? 0}{' '}
								upvotes
							</p>
						</div>
						<PermalinkButton
							size="icon"
							variant="ghost"
							from={Route.fullPath}
							text=""
							to="/learn/$lang/playlists/$playlistId"
							params={{ lang: playlist.lang, playlistId: playlist.id }}
						/>
						<Button
							size="icon"
							onClick={() => onSelect(playlist.id, playlist.lang)}
							disabled={isPending}
						>
							<Send className="-ms-0.5 mt-0.5 size-4" />
						</Button>
					</div>
				))}
			</div>
		</ScrollArea>
	)
}
