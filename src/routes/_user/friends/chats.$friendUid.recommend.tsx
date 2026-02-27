import { useState, useMemo, useRef, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { eq, useLiveQuery } from '@tanstack/react-db'
import { useDebounce } from '@uidotdev/usehooks'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import {
	Search,
	Send,
	X,
	Plus,
	MessageSquareQuote,
	ListMusic,
	MessageCircleHeart,
} from 'lucide-react'

import type { TablesInsert } from '@/types/supabase'
import supabase from '@/lib/supabase-client'
import { useUserId } from '@/lib/use-auth'
import { phrasesCollection } from '@/lib/collections/phrases'
import { phraseRequestsCollection } from '@/lib/collections/requests'
import { phrasePlaylistsCollection } from '@/lib/collections/playlists'

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { LangBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SelectOneOfYourLanguages } from '@/components/fields/select-one-of-your-languages'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { InlinePhraseCreator } from '@/components/phrases/inline-phrase-creator'

type ContentFilter = 'phrases' | 'playlists' | 'requests'

interface SearchResultBase {
	id: string
	lang: string
	title: string
	subtitle: string | null
}

interface PhraseResult extends SearchResultBase {
	type: 'phrases'
}

interface PlaylistResult extends SearchResultBase {
	type: 'playlists'
}

interface RequestResult extends SearchResultBase {
	type: 'requests'
}

type SearchResult = PhraseResult | PlaylistResult | RequestResult

export const Route = createFileRoute(
	'/_user/friends/chats/$friendUid/recommend'
)({
	component: RouteComponent,
})

function RouteComponent() {
	const params = Route.useParams()
	const userId = useUserId()
	const navigate = useNavigate({ from: Route.fullPath })
	const inputRef = useRef<HTMLInputElement>(null)

	const [lang, setLang] = useState<string>('')
	const [query, setQuery] = useState('')
	const [activeFilter, setActiveFilter] = useState<ContentFilter | null>(null)
	const [showCreator, setShowCreator] = useState(false)

	const debouncedQuery = useDebounce(query, 150)
	const lowerQuery = debouncedQuery.toLowerCase().trim()

	// Collections data
	const { data: allPhrases } = useLiveQuery((q) =>
		q.from({ phrase: phrasesCollection })
	)
	const { data: allRequests } = useLiveQuery((q) =>
		q
			.from({ req: phraseRequestsCollection })
			.where(({ req }) => eq(req.deleted, false))
	)
	const { data: allPlaylists } = useLiveQuery((q) =>
		q
			.from({ playlist: phrasePlaylistsCollection })
			.where(({ playlist }) => eq(playlist.deleted, false))
	)

	// Filter and search results
	const results = useMemo((): Array<SearchResult> => {
		const items: Array<SearchResult> = []
		const langFilter = lang || null

		if (activeFilter === null || activeFilter === 'phrases') {
			const matching =
				allPhrases
					?.filter((phrase) => {
						if (langFilter && phrase.lang !== langFilter) return false
						if (!lowerQuery) return true
						const searchText = [
							phrase.text,
							...(phrase.translations?.map((t) => t.text) ?? []),
						]
							.join(' ')
							.toLowerCase()
						return searchText.includes(lowerQuery)
					})
					.slice(0, 8) ?? []

			for (const phrase of matching) {
				items.push({
					id: phrase.id,
					type: 'phrases',
					lang: phrase.lang,
					title: phrase.text,
					subtitle: phrase.translations?.[0]?.text ?? null,
				})
			}
		}

		if (activeFilter === null || activeFilter === 'playlists') {
			const matching =
				allPlaylists
					?.filter((playlist) => {
						if (langFilter && playlist.lang !== langFilter) return false
						if (!lowerQuery) return true
						const searchText = [playlist.title, playlist.description ?? '']
							.join(' ')
							.toLowerCase()
						return searchText.includes(lowerQuery)
					})
					.slice(0, 8) ?? []

			for (const playlist of matching) {
				items.push({
					id: playlist.id,
					type: 'playlists',
					lang: playlist.lang,
					title: playlist.title,
					subtitle: playlist.description,
				})
			}
		}

		if (activeFilter === null || activeFilter === 'requests') {
			const matching =
				allRequests
					?.filter((req) => {
						if (langFilter && req.lang !== langFilter) return false
						if (!lowerQuery) return true
						return req.prompt.toLowerCase().includes(lowerQuery)
					})
					.slice(0, 8) ?? []

			for (const req of matching) {
				items.push({
					id: req.id,
					type: 'requests',
					lang: req.lang,
					title: req.prompt,
					subtitle: null,
				})
			}
		}

		return items
	}, [allPhrases, allPlaylists, allRequests, activeFilter, lang, lowerQuery])

	const showResults =
		lowerQuery.length > 0 || activeFilter !== null || lang.length > 0

	// Focus input when dialog opens
	useEffect(() => {
		const t = setTimeout(() => inputRef.current?.focus(), 50)
		return () => clearTimeout(t)
	}, [])

	const closeDialog = () => {
		void navigate({ to: '/friends/chats/$friendUid', params })
	}

	const sendMessageMutation = useMutation({
		mutationFn: async (newMessage: TablesInsert<'chat_message'>) => {
			const { error } = await supabase.from('chat_message').insert(newMessage)
			if (error) throw error
		},
		onSuccess: (_data, variables) => {
			const label =
				variables.message_type === 'recommendation' ? 'Phrase'
				: variables.message_type === 'playlist' ? 'Playlist'
				: 'Request'
			closeDialog()
			toastSuccess(`${label} sent!`)
		},
		onError: (error) => {
			toastError(`Failed to send: ${error.message}`)
		},
	})

	const handleSend = (result: SearchResult) => {
		if (!userId) return
		const base = {
			sender_uid: userId,
			recipient_uid: params.friendUid,
			lang: result.lang,
		}

		if (result.type === 'phrases') {
			void sendMessageMutation.mutate({
				...base,
				phrase_id: result.id,
				message_type: 'recommendation',
			})
		} else if (result.type === 'playlists') {
			void sendMessageMutation.mutate({
				...base,
				playlist_id: result.id,
				message_type: 'playlist',
			})
		} else {
			void sendMessageMutation.mutate({
				...base,
				request_id: result.id,
				message_type: 'request',
			})
		}
	}

	const handlePhraseCreated = (phraseId: string) => {
		setShowCreator(false)
		// Send the newly created phrase immediately
		if (!userId || !lang) return
		void sendMessageMutation.mutate({
			sender_uid: userId,
			recipient_uid: params.friendUid,
			phrase_id: phraseId,
			lang,
			message_type: 'recommendation',
		})
	}

	return (
		<Dialog
			open={true}
			onOpenChange={(open) => {
				if (!open) closeDialog()
			}}
		>
			<DialogContent
				className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0"
				data-testid="chat-recommend-overlay"
			>
				<DialogHeader className="px-4 pt-4 pb-0">
					<DialogTitle>Send to friend</DialogTitle>
					<DialogDescription className="sr-only">
						Search for phrases, playlists, or requests to send to your friend
					</DialogDescription>
				</DialogHeader>

				{/* Search Input */}
				<div className="p-3">
					<div className="bg-muted/50 flex items-center gap-3 rounded-2xl border px-3 py-2 inset-shadow-sm">
						<Search className="text-muted-foreground size-5 shrink-0" />
						<input
							ref={inputRef}
							type="text"
							placeholder="Search phrases, playlists, requests..."
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className="placeholder:text-muted-foreground flex-1 bg-transparent text-base outline-none"
							data-testid="chat-recommend-search-input"
						/>
						{query && (
							<button
								type="button"
								onClick={() => setQuery('')}
								className="text-muted-foreground hover:text-foreground"
							>
								<X className="size-4" />
							</button>
						)}
					</div>
				</div>

				{/* Filter Tabs */}
				<div className="border-b px-4 py-2.5">
					<Tabs
						value={activeFilter ?? 'all'}
						onValueChange={(v) =>
							setActiveFilter(v === 'all' ? null : (v as ContentFilter))
						}
					>
						<TabsList>
							<TabsTrigger value="all">All</TabsTrigger>
							<TabsTrigger value="phrases">
								<MessageSquareQuote className="me-1 size-4" />
								Phrases
							</TabsTrigger>
							<TabsTrigger value="playlists">
								<ListMusic className="me-1 size-4" />
								Playlists
							</TabsTrigger>
							<TabsTrigger value="requests">
								<MessageCircleHeart className="me-1 size-4" />
								Requests
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>

				{/* Language Filter */}
				<div className="border-b px-4 py-2.5">
					<SelectOneOfYourLanguages value={lang} setValue={setLang} />
				</div>

				{/* Results */}
				<div className="min-h-0 flex-1 overflow-y-auto">
					{showResults ?
						results.length === 0 ?
							<div className="text-muted-foreground px-4 py-8 text-center text-sm">
								No results found
							</div>
						:	results.map((result) => (
								<SendableResult
									key={`${result.type}-${result.id}`}
									result={result}
									showType={activeFilter === null}
									onSend={() => handleSend(result)}
									disabled={sendMessageMutation.isPending}
								/>
							))

					:	<div className="text-muted-foreground px-4 py-8 text-center text-sm">
							Search for something to send
						</div>
					}
				</div>

				{/* Create New Phrase */}
				<div className="border-t px-4 py-3">
					{showCreator ?
						lang ?
							<InlinePhraseCreator
								lang={lang}
								onPhraseCreated={handlePhraseCreated}
								onCancel={() => setShowCreator(false)}
							/>
						:	<div className="space-y-3">
								<p className="text-muted-foreground text-sm">
									Select a language above to create a new phrase.
								</p>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setShowCreator(false)}
								>
									Cancel
								</Button>
							</div>

					:	<Button
							variant="soft"
							size="sm"
							className="w-full"
							onClick={() => setShowCreator(true)}
						>
							<Plus className="size-4" />
							Create a new phrase
						</Button>
					}
				</div>
			</DialogContent>
		</Dialog>
	)
}

function SendableResult({
	result,
	showType,
	onSend,
	disabled,
}: {
	result: SearchResult
	showType: boolean
	onSend: () => void
	disabled: boolean
}) {
	const typeIcon =
		result.type === 'phrases' ?
			<MessageSquareQuote className="size-3.5" />
		: result.type === 'playlists' ?
			<ListMusic className="size-3.5" />
		:	<MessageCircleHeart className="size-3.5" />

	const typeLabel =
		result.type === 'phrases' ? 'phrase'
		: result.type === 'playlists' ? 'playlist'
		: 'request'

	return (
		<button
			type="button"
			onClick={onSend}
			disabled={disabled}
			data-testid={`send-${result.type}-${result.id}`}
			className="flex w-full items-center gap-3 px-4 py-2.5 text-start transition-colors hover:bg-lc-up-2 disabled:opacity-50"
		>
			<LangBadge lang={result.lang} />
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{result.title}</p>
				{result.subtitle && (
					<p className="text-muted-foreground truncate text-xs">
						{result.subtitle}
					</p>
				)}
			</div>
			{showType && (
				<span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
					{typeIcon}
					{typeLabel}
				</span>
			)}
			<Send className="text-muted-foreground size-4 shrink-0" />
		</button>
	)
}
