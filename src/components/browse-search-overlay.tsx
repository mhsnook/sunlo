import {
	useState,
	useRef,
	useEffect,
	useMemo,
	useCallback,
	type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { Link } from '@tanstack/react-router'
import { useDebounce } from '@uidotdev/usehooks'
import { eq, useLiveQuery } from '@tanstack/react-db'
import {
	Search,
	X,
	ChevronDown,
	ChevronUp,
	ArrowUp,
	ArrowDown,
	CornerDownLeft,
	Command,
	MessageSquareQuote,
	ListMusic,
	MessageCircleHeart,
} from 'lucide-react'

import {
	phrasesCollection,
	phraseRequestsCollection,
	phrasePlaylistsCollection,
} from '@/lib/collections'
import { useDecks } from '@/hooks/use-deck'
import languages from '@/lib/languages'
import { LangBadge } from '@/components/ui/badge'
import { SelectOneLanguage } from '@/components/select-one-language'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

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
	playlistId: string
}

interface RequestResult extends SearchResultBase {
	type: 'requests'
}

type SearchResult = PhraseResult | PlaylistResult | RequestResult

export default function BrowseSearchOverlay({
	open,
	onClose,
}: {
	open: boolean
	onClose: () => void
}) {
	const inputRef = useRef<HTMLInputElement>(null)
	const listRef = useRef<HTMLDivElement>(null)

	const [query, setQuery] = useState('')
	const [activeFilter, setActiveFilter] = useState<ContentFilter | null>(null)
	const [selectedLangs, setSelectedLangs] = useState<Array<string>>([])
	const [langsExpanded, setLangsExpanded] = useState(true)
	const [selectedIndex, setSelectedIndex] = useState(0)

	const debouncedQuery = useDebounce(query, 150)
	const lowerQuery = debouncedQuery.toLowerCase().trim()

	// Get user's deck languages
	const { data: userDecks } = useDecks()
	const userLangs = useMemo(
		() =>
			userDecks
				?.filter((d) => !d.archived)
				?.map((d) => ({ code: d.lang, name: d.language })) ?? [],
		[userDecks]
	)

	// Build the list of language pills to show (user langs + any manually added)
	const [extraLangs, setExtraLangs] = useState<
		Array<{ code: string; name: string }>
	>([])
	const displayLangs = useMemo(() => {
		const base = userLangs.length > 0 ? [...userLangs] : []
		for (const extra of extraLangs) {
			if (!base.some((l) => l.code === extra.code)) {
				base.push(extra)
			}
		}
		return base
	}, [userLangs, extraLangs])

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
		const langSet = selectedLangs.length > 0 ? new Set(selectedLangs) : null

		if (activeFilter === null || activeFilter === 'phrases') {
			const matching =
				allPhrases
					?.filter((phrase) => {
						if (langSet && !langSet.has(phrase.lang)) return false
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
						if (langSet && !langSet.has(playlist.lang)) return false
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
					playlistId: playlist.id,
				})
			}
		}

		if (activeFilter === null || activeFilter === 'requests') {
			const matching =
				allRequests
					?.filter((req) => {
						if (langSet && !langSet.has(req.lang)) return false
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
					subtitle: `${req.upvote_count} upvotes`,
				})
			}
		}

		return items
	}, [
		allPhrases,
		allPlaylists,
		allRequests,
		activeFilter,
		selectedLangs,
		lowerQuery,
	])

	// Reset selected index when results change
	useEffect(() => {
		setSelectedIndex(0)
	}, [results.length, activeFilter, lowerQuery])

	// Navigate to a result by clicking the link element
	const openResult = useCallback((index: number) => {
		if (!listRef.current) return
		const links = listRef.current.querySelectorAll('a')
		links[index]?.click()
	}, [])

	// Keyboard handling within the dialog
	const handleKeyDown = useCallback(
		(e: ReactKeyboardEvent) => {
			if (e.key === 'ArrowDown') {
				e.preventDefault()
				setSelectedIndex((prev) =>
					prev < results.length - 1 ? prev + 1 : prev
				)
			} else if (e.key === 'ArrowUp') {
				e.preventDefault()
				setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
			} else if (e.key === 'Enter' && results[selectedIndex]) {
				e.preventDefault()
				openResult(selectedIndex)
			}
		},
		[results, selectedIndex, openResult]
	)

	// Focus input when dialog opens
	useEffect(() => {
		if (open) {
			// Small delay to let Dialog finish rendering
			const t = setTimeout(() => inputRef.current?.focus(), 50)
			return () => clearTimeout(t)
		}
	}, [open])

	// Scroll selected item into view
	useEffect(() => {
		if (!listRef.current) return
		const selected = listRef.current.querySelector('[data-selected="true"]')
		selected?.scrollIntoView({ block: 'nearest' })
	}, [selectedIndex])

	// Toggle a language filter
	const toggleLang = (langCode: string) => {
		setSelectedLangs((prev) =>
			prev.includes(langCode) ?
				prev.filter((l) => l !== langCode)
			:	[...prev, langCode]
		)
	}

	// Add a language from the combobox
	const [addLangValue, setAddLangValue] = useState('')
	const handleAddLanguage = useCallback((langCode: string) => {
		if (!langCode) return
		const name = languages[langCode] ?? langCode
		setExtraLangs((prev) => {
			if (prev.some((l) => l.code === langCode)) return prev
			return [...prev, { code: langCode, name }]
		})
		setSelectedLangs((prev) =>
			prev.includes(langCode) ? prev : [...prev, langCode]
		)
		// Reset the combobox after a tick so the popover closes
		setTimeout(() => setAddLangValue(''), 0)
	}, [])

	const hasQuery = lowerQuery.length > 0
	const showResults =
		hasQuery || activeFilter !== null || selectedLangs.length > 0

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent
				className="flex max-h-[80vh] flex-col gap-0 overflow-hidden p-0"
				data-testid="browse-search-overlay"
			>
				{/* Heading row — dialog's built-in X sits here */}
				<div className="px-4 pt-4 pb-0">
					<DialogTitle className="text-muted-foreground text-sm font-medium">
						Search the public library
					</DialogTitle>
				</div>

				{/* Search Input */}
				<div className="p-3" onKeyDown={handleKeyDown}>
					<div className="bg-muted/50 flex items-center gap-3 rounded-2xl border px-3 py-2 inset-shadow-sm">
						<Search className="text-muted-foreground size-5 shrink-0" />
						<input
							ref={inputRef}
							type="text"
							placeholder="Search phrases, playlists, requests..."
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className="placeholder:text-muted-foreground flex-1 bg-transparent text-base outline-none"
							data-testid="browse-search-input"
							onKeyDown={handleKeyDown}
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

				{/* Languages Section */}
				<div className="border-b px-4 py-2.5">
					<button
						type="button"
						className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between text-sm font-medium"
						onClick={() => setLangsExpanded((prev) => !prev)}
					>
						<span>Languages</span>
						{langsExpanded ?
							<ChevronUp className="size-4" />
						:	<ChevronDown className="size-4" />}
					</button>

					{langsExpanded && (
						<div className="mt-2 space-y-2">
							{displayLangs.length > 0 && (
								<div className="flex flex-wrap gap-1.5">
									{displayLangs.map((l) => (
										<button
											key={l.code}
											type="button"
											onClick={() => toggleLang(l.code)}
											className={cn(
												'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
												selectedLangs.includes(l.code) ?
													'bg-primary-foresoft dark:bg-primary border-transparent text-white'
												:	'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
											)}
										>
											{l.name}
										</button>
									))}
								</div>
							)}
							<SelectOneLanguage
								value={addLangValue}
								setValue={handleAddLanguage}
								disabled={displayLangs.map((l) => l.code)}
								size="default"
							/>
						</div>
					)}
				</div>

				{/* Results */}
				{showResults && (
					<div
						ref={listRef}
						className="min-h-0 flex-1 overflow-y-auto"
						data-testid="browse-search-results"
					>
						{results.length === 0 ?
							<div className="text-muted-foreground px-4 py-8 text-center text-sm">
								No results found
							</div>
						:	results.map((result, index) => (
								<SearchResultLink
									key={`${result.type}-${result.id}`}
									result={result}
									isSelected={index === selectedIndex}
									showType={activeFilter === null}
									onMouseEnter={() => setSelectedIndex(index)}
								/>
							))
						}
					</div>
				)}

				{/* Keyboard Shortcuts Footer */}
				<div className="text-muted-foreground bg-muted/30 flex items-center gap-4 border-t px-4 py-2 text-xs">
					<span className="inline-flex items-center gap-1">
						<ArrowUp className="size-3" />
						<ArrowDown className="size-3" />
						Navigate
					</span>
					<span className="inline-flex items-center gap-1">
						<CornerDownLeft className="size-3" />
						Open
					</span>
					<span className="inline-flex items-center gap-1">
						<Command className="size-3" />K Toggle
					</span>
					<span>Esc Close</span>
				</div>
			</DialogContent>
		</Dialog>
	)
}

function SearchResultLink({
	result,
	isSelected,
	showType,
	onMouseEnter,
}: {
	result: SearchResult
	isSelected: boolean
	showType: boolean
	onMouseEnter: () => void
}) {
	const className = cn(
		'flex items-center gap-3 px-4 py-2.5 transition-colors',
		isSelected ? 'bg-primary/10' : 'hover:bg-primary/5'
	)

	const inner = (
		<>
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
				<span className="text-muted-foreground shrink-0 text-xs capitalize">
					{result.type === 'phrases' ?
						'phrase'
					: result.type === 'playlists' ?
						'playlist'
					:	'request'}
				</span>
			)}
		</>
	)

	if (result.type === 'phrases') {
		return (
			<Link
				to="/learn/$lang/phrases/$id"
				params={{ lang: result.lang, id: result.id }}
				data-selected={isSelected}
				className={className}
				onMouseEnter={onMouseEnter}
			>
				{inner}
			</Link>
		)
	}

	if (result.type === 'playlists') {
		return (
			<Link
				to="/learn/$lang/playlists/$playlistId"
				params={{ lang: result.lang, playlistId: result.playlistId }}
				data-selected={isSelected}
				className={className}
				onMouseEnter={onMouseEnter}
			>
				{inner}
			</Link>
		)
	}

	return (
		<Link
			to="/learn/$lang/requests/$id"
			params={{ lang: result.lang, id: result.id }}
			data-selected={isSelected}
			className={className}
			onMouseEnter={onMouseEnter}
		>
			{inner}
		</Link>
	)
}
