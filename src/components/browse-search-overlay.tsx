import {
	useState,
	useRef,
	useEffect,
	useMemo,
	useCallback,
	type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { Link } from '@tanstack/react-router'
import { useDebounce } from '@/hooks/use-debounce'
import { useLocalSearch } from '@/hooks/use-local-search'
import { useHybridSearch, combinedScore } from '@/hooks/use-hybrid-search'
import {
	Search,
	X,
	Plus,
	ArrowUp,
	ArrowDown,
	CornerDownLeft,
	Command,
	ArrowRight,
} from 'lucide-react'

import { useDecks } from '@/features/deck/hooks'
import languages from '@/lib/languages'
import { LangBadge } from '@/components/ui/badge'
import { SelectOneLanguage } from '@/components/select-one-language'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { SearchResult } from '@/types/search-result'

export default function BrowseSearchOverlay({
	onClose,
	initialLangs,
}: {
	onClose: () => void
	initialLangs?: Array<string>
}) {
	const inputRef = useRef<HTMLInputElement>(null)
	const listRef = useRef<HTMLDivElement>(null)

	const [query, setQuery] = useState('')
	const [selectedLangs, setSelectedLangs] = useState<Array<string>>(
		initialLangs ?? []
	)
	const [selectedIndex, setSelectedIndex] = useState(0)

	const debouncedQuery = useDebounce(query, 150)
	const lowerQuery = debouncedQuery.toLowerCase().trim()
	const hasQuery = lowerQuery.length > 0

	// Get user's deck languages
	const { data: userDecks } = useDecks()
	const userLangs = useMemo(
		() =>
			userDecks
				?.filter((d) => !d.archived)
				?.map((d) => ({ code: d.lang, name: d.language })) ?? [],
		[userDecks]
	)

	// Build the list of language pills (user langs + manually added)
	const [extraLangs, setExtraLangs] = useState<
		Array<{ code: string; name: string }>
	>([])
	const displayLangs = useMemo(() => {
		const base = userLangs.length > 0 ? [...userLangs] : []
		for (const code of selectedLangs) {
			if (!base.some((l) => l.code === code)) {
				base.push({ code, name: languages[code] ?? code })
			}
		}
		for (const extra of extraLangs) {
			if (!base.some((l) => l.code === extra.code)) {
				base.push(extra)
			}
		}
		return base
	}, [userLangs, extraLangs, selectedLangs])

	// Layered search: local for instant feedback (in-memory substring match),
	// Layered search:
	//   - useLocalSearch fires synchronously off the local collections —
	//     instant phrase / playlist / request matches that render before
	//     the server returns.
	//   - useHybridSearch fires after the debounce settles, returning
	//     server-side combined rankings.
	// Both go into one merged list ranked by combinedScore desc — same
	// formula and ordering as /search, so the diagnostic page actually
	// diagnoses the overlay.
	const local = useLocalSearch(
		selectedLangs.length > 0 ? selectedLangs : null,
		debouncedQuery,
		{ limit: 20 }
	)
	const hybrid = useHybridSearch(selectedLangs, debouncedQuery)

	const results = useMemo((): Array<SearchResult> => {
		if (!hasQuery) return []

		type ScoredItem = SearchResult & { score: number }
		const byId = new Map<string, ScoredItem>()

		const recordPhrase = (
			id: string,
			lang: string,
			text: string,
			translation: string | null,
			semantic: number,
			trigram: number
		) => {
			const score = combinedScore(semantic, trigram)
			const existing = byId.get(id)
			if (existing && existing.score >= score) return
			byId.set(id, {
				id,
				type: 'phrase',
				lang,
				title: text,
				subtitle: translation,
				score,
			})
		}

		// Server-ranked phrases first — they have real scores.
		for (const p of hybrid.data) {
			recordPhrase(
				p.id,
				p.lang,
				p.text,
				p.translations_mine?.[0]?.text ??
					p.translations_other?.[0]?.text ??
					null,
				p.semanticScore,
				p.similarityScore
			)
		}
		// Local phrases that the server didn't surface get a synthetic
		// trigram score so they still appear (e.g., before debounce settles
		// or when search_corpus is empty).
		for (const p of local.phrases) {
			if (byId.has(p.id)) continue
			recordPhrase(
				p.id,
				p.lang,
				p.text,
				p.translations?.[0]?.text ?? null,
				0,
				0.3
			)
		}

		for (const playlist of local.playlists) {
			const semantic = hybrid.semanticById.get(playlist.id) ?? 0
			const trigram = hybrid.trigramById.get(playlist.id) ?? 0.3
			byId.set(playlist.id, {
				id: playlist.id,
				type: 'playlist',
				lang: playlist.lang,
				title: playlist.title,
				subtitle: playlist.description,
				score: combinedScore(semantic, trigram),
			})
		}

		for (const req of local.requests) {
			const semantic = hybrid.semanticById.get(req.id) ?? 0
			const trigram = hybrid.trigramById.get(req.id) ?? 0.3
			byId.set(req.id, {
				id: req.id,
				type: 'request',
				lang: req.lang,
				title: req.prompt,
				subtitle: `${req.upvote_count} upvotes`,
				score: combinedScore(semantic, trigram),
			})
		}

		return [...byId.values()]
			.toSorted((a, b) => b.score - a.score)
			.slice(0, 20)
			.map(({ score: _score, ...rest }) => rest)
	}, [
		hasQuery,
		local.phrases,
		local.playlists,
		local.requests,
		hybrid.data,
		hybrid.semanticById,
		hybrid.trigramById,
	])

	// Reset selected index when results change
	const resetKey = `${results.length}-${lowerQuery}`
	const [prevResetKey, setPrevResetKey] = useState(resetKey)
	if (resetKey !== prevResetKey) {
		setPrevResetKey(resetKey)
		setSelectedIndex(0)
	}

	// Navigate to a result by clicking the link element
	const openResult = useCallback((index: number) => {
		if (!listRef.current) return
		const links = listRef.current.querySelectorAll('a')
		links[index]?.click()
	}, [])

	// Keyboard handling
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

	// Focus input on mount
	useEffect(() => {
		const t = setTimeout(() => inputRef.current?.focus(), 50)
		return () => clearTimeout(t)
	}, [])

	// Scroll selected item into view
	useEffect(() => {
		if (!listRef.current) return
		const selected = listRef.current.querySelector('[data-selected="true"]')
		selected?.scrollIntoView({ block: 'nearest' })
	}, [selectedIndex])

	// Language filter actions
	const toggleLang = (langCode: string) => {
		setSelectedLangs((prev) =>
			prev.includes(langCode)
				? prev.filter((l) => l !== langCode)
				: [...prev, langCode]
		)
	}

	const [addLangValue, setAddLangValue] = useState('')
	const handleAddLanguage = useCallback((langCode: string) => {
		if (!langCode) return
		const name = languages[langCode] ?? langCode
		setExtraLangs((prev) => {
			if (prev.some((l) => l.code === langCode)) return prev
			return [...prev, { code: langCode, name }]
		})
		setSelectedLangs((prev) => {
			if (prev.includes(langCode)) return prev
			return [...prev, langCode]
		})
		setTimeout(() => setAddLangValue(''), 0)
	}, [])

	const showResults = hasQuery

	return (
		<Dialog open onOpenChange={(o) => !o && onClose()}>
			<DialogContent
				className={`flex max-h-[80vh] ${!hasQuery ? 'max-w-xl gap-2 p-4' : 'gap-0 p-0'} flex-col overflow-hidden`}
				data-testid="browse-search-overlay"
			>
				{/* Heading */}
				<div className="px-4 pt-4 pb-0">
					<DialogTitle
						className={`text-muted-foreground ${hasQuery ? 'text-sm' : 'text-xl'} font-medium`}
					>
						Search the public library
					</DialogTitle>
				</div>

				{/* Search Input */}
				<div className="p-3" role="search" onKeyDown={handleKeyDown}>
					<div className="bg-muted/50 flex items-center gap-3 rounded-2xl border px-3 py-2 inset-shadow-sm">
						<Search className="text-muted-foreground size-5 shrink-0" />
						<input
							ref={inputRef}
							type="text"
							placeholder="Search phrases, playlists, requests..."
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className={`${hasQuery ? 'text-base' : 'p-2 text-xl'} placeholder:text-muted-foreground flex-1 bg-transparent outline-none`}
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

				{/* Language pills */}
				{hasQuery && displayLangs.length > 0 && (
					<div className="flex flex-wrap gap-1.5 border-b px-4 py-2.5">
						{displayLangs.map((l) => (
							<button
								key={l.code}
								type="button"
								onClick={() => toggleLang(l.code)}
								className={cn(
									'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
									selectedLangs.includes(l.code)
										? 'bg-primary-foresoft text-primary-foreground border-transparent'
										: 'border-border text-muted-foreground hover:border-4-mlo-primary hover:text-foreground'
								)}
							>
								{l.name}
							</button>
						))}
						<SelectOneLanguage
							value={addLangValue}
							setValue={handleAddLanguage}
							disabled={displayLangs.map((l) => l.code)}
							popoverAlign="start"
							trigger={
								// oxlint-disable-next-line jsx-no-jsx-as-prop
								<button
									type="button"
									className="border-border text-muted-foreground hover:border-4-mlo-primary hover:text-foreground flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
								>
									<Plus className="size-3" />
									more
								</button>
							}
						/>
					</div>
				)}

				{/* Results */}
				{showResults && (
					<div
						ref={listRef}
						className="min-h-0 flex-1 overflow-y-auto"
						data-testid="browse-search-results"
					>
						{results.length === 0 ? (
							<div className="text-muted-foreground px-4 py-8 text-center text-sm">
								No results found
							</div>
						) : (
							results.map((result, index) => (
								<SearchResultLink
									key={`${result.type}-${result.id}`}
									result={result}
									isSelected={index === selectedIndex}
									onMouseEnter={() => setSelectedIndex(index)}
								/>
							))
						)}
					</div>
				)}

				{/* Footer — only after typing */}
				{hasQuery && (
					<div className="text-muted-foreground bg-muted/30 flex items-center gap-4 border-t px-4 py-2 text-xs max-sm:hidden">
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
						<Link
							to="/search"
							search={{
								q: lowerQuery || undefined,
								langs:
									selectedLangs.length > 0
										? selectedLangs.join(',')
										: undefined,
							}}
							className="hover:text-foreground ms-auto inline-flex items-center gap-1 font-medium"
							onClick={onClose}
						>
							View all results
							<ArrowRight className="size-3" />
						</Link>
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}

function SearchResultLink({
	result,
	isSelected,
	onMouseEnter,
}: {
	result: SearchResult
	isSelected: boolean
	onMouseEnter: () => void
}) {
	const className =
		'flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-lc-up-2 data-[selected=true]:bg-lc-up-2'

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
			<span className="text-muted-foreground shrink-0 text-xs capitalize">
				{result.type}
			</span>
		</>
	)

	const linkProps = {
		'data-selected': isSelected,
		className,
		onMouseEnter,
	} as const

	if (result.type === 'phrase') {
		return (
			<Link
				to="/learn/$lang/phrases/$id"
				params={{ lang: result.lang, id: result.id }}
				{...linkProps}
			>
				{inner}
			</Link>
		)
	}

	if (result.type === 'playlist') {
		return (
			<Link
				to="/learn/$lang/playlists/$playlistId"
				params={{ lang: result.lang, playlistId: result.id }}
				{...linkProps}
			>
				{inner}
			</Link>
		)
	}

	return (
		<Link
			to="/learn/$lang/requests/$id"
			params={{ lang: result.lang, id: result.id }}
			{...linkProps}
		>
			{inner}
		</Link>
	)
}
