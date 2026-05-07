import { useState, useMemo, useRef, useEffect, type ReactNode } from 'react'
import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import * as z from 'zod'
import {
	Search,
	SlidersHorizontal,
	X,
	Plus,
	Sparkles,
	MessageCircle,
	Users,
	SearchX,
	MessageSquareQuote,
	ListMusic,
	MessageCircleHeart,
	ArrowUp,
} from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge, LangBadge } from '@/components/ui/badge'
import allLanguages from '@/lib/languages'
import { cn } from '@/lib/utils'
import {
	useAllLangTags,
	useLanguagesWithPhrases,
} from '@/features/languages/hooks'
import type { LanguageType, LangTagType } from '@/features/languages/schemas'
import type { PhrasePlaylistType } from '@/features/playlists/schemas'
import type { PhraseRequestType } from '@/features/requests/schemas'
import {
	combinedScore,
	type HybridSearchResult,
} from '@/hooks/use-hybrid-search'
import {
	useMergedSearch,
	type MergedSearchItem,
} from '@/hooks/use-merged-search'

import { parseSearchInput, type SearchFilter } from '@/lib/parse-search-input'
import type { SearchEntityType } from '@/hooks/search-config'

// --- Route ---

const SearchParams = z.object({
	q: z.string().optional(),
	langs: z.string().optional(),
})

// /search is a layout that just renders its children — the actual search UI
// lives in search.index.tsx (for /search) and search.test.tsx (for the
// hidden /search/test diagnostic route). Both render <SearchPage />.
export const Route = createFileRoute('/_user/search')({
	component: () => <Outlet />,
	validateSearch: SearchParams,
	beforeLoad: () => ({
		titleBar: {
			title: 'Search',
		},
		appnav: [],
		fixedHeight: true,
	}),
})

// --- Main Component ---

export function SearchPage({ diagnostic = false }: { diagnostic?: boolean }) {
	const { q: initialQuery, langs: initialLangs } = Route.useSearch()

	const [inputText, setInputText] = useState(initialQuery ?? '')
	const [filters, setFilters] = useState<Array<SearchFilter>>(() => {
		if (!initialLangs) return []
		const langCodes = initialLangs.split(',').filter((l) => l in allLanguages)
		return langCodes.map((code) => ({
			type: 'lang' as const,
			value: code,
			label: allLanguages[code] ?? code,
		}))
	})
	const [showQuickFilters, setShowQuickFilters] = useState(false)
	const [typeFilters, setTypeFilters] = useState<Set<SearchEntityType>>(
		new Set()
	)
	const scrollRef = useRef<HTMLDivElement>(null)

	// Derive explicit filter values
	const langFilter = filters.find((f) => f.type === 'lang')?.value
	const tagFilters = filters.filter((f) => f.type === 'tag').map((f) => f.value)

	// Languages that have phrases (sorted by phrases_to_learn desc)
	const { data: sortedLanguagesData } = useLanguagesWithPhrases()
	const sortedLanguages = sortedLanguagesData ?? []

	// All tags (per-language)
	const { data: allTags } = useAllLangTags()

	const uniqueTagNames = useMemo(
		() => [...new Set(allTags?.map((t) => t.name) ?? [])].toSorted(),
		[allTags]
	)

	// Tags deduplicated by name+lang for display
	const uniqueTags = useMemo(() => {
		const seen = new Set<string>()
		return (allTags ?? [])
			.filter((t) => {
				const key = `${t.lang}:${t.name}`
				if (seen.has(key)) return false
				seen.add(key)
				return true
			})
			.toSorted((a, b) => a.name.localeCompare(b.name))
	}, [allTags])

	// Smart parse: detect filter suggestions, strip explicit filter label words
	const parsed = useMemo(
		() => parseSearchInput(inputText, filters, uniqueTagNames),
		[inputText, filters, uniqueTagNames]
	)

	const effectiveText = parsed.effectiveText

	// Searches activate on text only — lang and tag chips are filters on a
	// text query, not standalone activators. (If you want "all Hindi
	// phrases," that's /learn/$lang or the browse charts, not /search.)
	const hasActiveSearch = effectiveText.length >= 2

	const smartSearch = useMergedSearch(
		langFilter ? [langFilter] : [],
		hasActiveSearch ? effectiveText : ''
	)

	const { mergedResults, phraseCount, playlistCount, requestCount } =
		useMemo(() => {
			const items: Array<MergedSearchItem> = []
			let phrases = 0
			let playlists = 0
			let requests = 0
			for (const item of smartSearch.items) {
				if (typeFilters.size > 0 && !typeFilters.has(item.type)) continue
				if (
					item.type === 'phrase' &&
					tagFilters.length > 0 &&
					!tagFilters.every((tag) =>
						(item.entity.tags ?? []).some((t) => t?.name === tag)
					)
				) {
					continue
				}
				items.push(item)
				if (item.type === 'phrase') phrases++
				else if (item.type === 'playlist') playlists++
				else requests++
			}
			return {
				mergedResults: items,
				phraseCount: phrases,
				playlistCount: playlists,
				requestCount: requests,
			}
		}, [smartSearch.items, typeFilters, tagFilters])

	const totalCount = mergedResults.length
	const isSearching = hasActiveSearch && smartSearch.isLoading

	// --- Actions ---

	const addFilter = (filter: SearchFilter) => {
		setFilters((prev) => {
			if (prev.some((f) => f.type === filter.type && f.value === filter.value))
				return prev
			// Only one lang filter at a time
			if (filter.type === 'lang') {
				return [...prev.filter((f) => f.type !== 'lang'), filter]
			}
			return [...prev, filter]
		})
	}

	const removeFilter = (filter: SearchFilter) => {
		setFilters((prev) =>
			prev.filter((f) => !(f.type === filter.type && f.value === filter.value))
		)
	}

	const clearAll = () => {
		setFilters([])
		setTypeFilters(new Set())
		setInputText('')
	}

	const toggleTypeFilter = (type: SearchEntityType) => {
		setTypeFilters((prev) => {
			const next = new Set(prev)
			if (next.has(type)) {
				next.delete(type)
			} else {
				next.add(type)
			}
			return next
		})
	}

	// Scroll to top when filters change
	useEffect(() => {
		scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
	}, [langFilter, tagFilters.length, typeFilters.size])

	// Build status message
	const statusMessage = useMemo(() => {
		if (!hasActiveSearch) return null
		if (isSearching) return 'Searching...'
		if (totalCount === 0) return null // handled by EmptyResults

		const parts: Array<string> = []
		if (phraseCount > 0)
			parts.push(`${phraseCount} phrase${phraseCount !== 1 ? 's' : ''}`)
		if (playlistCount > 0)
			parts.push(`${playlistCount} playlist${playlistCount !== 1 ? 's' : ''}`)
		if (requestCount > 0)
			parts.push(`${requestCount} request${requestCount !== 1 ? 's' : ''}`)

		let msg = `Found ${parts.join(', ')}`
		if (langFilter) msg += ` in ${allLanguages[langFilter] ?? langFilter}`
		if (effectiveText.length >= 2) msg += ` matching "${effectiveText}" (fuzzy)`
		return msg
	}, [
		hasActiveSearch,
		isSearching,
		totalCount,
		phraseCount,
		playlistCount,
		requestCount,
		langFilter,
		effectiveText,
	])

	return (
		<div className="flex h-full flex-col" data-testid="search-page">
			{/* Scrollable content area */}
			<div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
				{!hasActiveSearch ? (
					<WelcomeState
						onSelectLanguage={(code, name) =>
							addFilter({
								type: 'lang',
								value: code,
								label: name,
							})
						}
						onSelectLangTag={(lang, tagName) => {
							addFilter({
								type: 'lang',
								value: lang,
								label: allLanguages[lang] ?? lang,
							})
							addFilter({
								type: 'tag',
								value: tagName,
								label: tagName,
							})
						}}
						languages={sortedLanguages}
						tags={uniqueTags}
					/>
				) : (
					<div className="space-y-3 p-4">
						{statusMessage && <SystemMessage>{statusMessage}</SystemMessage>}
						{!isSearching && totalCount === 0 && <EmptyResults />}
						{totalCount > 0 && (
							<div className="flex flex-col gap-2">
								{mergedResults.map((item) =>
									item.type === 'phrase' ? (
										<PhraseResultRow
											key={`phrase-${item.id}`}
											phrase={item.entity}
											diagnostic={diagnostic}
										/>
									) : (
										<EntityResultRow
											key={`${item.type}-${item.id}`}
											type={item.type}
											entity={item.entity}
											diagnostic={diagnostic}
											semanticScore={item.semanticScore}
											trigramScore={item.trigramScore}
										/>
									)
								)}
							</div>
						)}
						{hasActiveSearch && smartSearch.hasNextPage && (
							<div className="flex justify-center pt-2">
								<Button
									variant="soft"
									size="sm"
									onClick={() => void smartSearch.fetchNextPage()}
									disabled={smartSearch.isFetchingNextPage}
								>
									{smartSearch.isFetchingNextPage
										? 'Loading...'
										: 'Load more phrases'}
								</Button>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Bottom input area */}
			<div className="bg-background border-t">
				{/* Quick Filters panel */}
				{showQuickFilters && (
					<QuickFiltersPanel
						languages={sortedLanguages}
						tags={uniqueTags}
						langFilter={langFilter}
						filters={filters}
						onAddFilter={addFilter}
						onRemoveFilter={removeFilter}
						onClose={() => setShowQuickFilters(false)}
					/>
				)}

				{/* Active filters + type filters */}
				{(filters.length > 0 || typeFilters.size > 0) && (
					<div className="flex flex-wrap items-center gap-2 px-4 pt-3">
						<span className="text-muted-foreground text-xs">Active:</span>
						{filters.map((f) => (
							<FilterPill
								key={`${f.type}-${f.value}`}
								active
								onClick={() => removeFilter(f)}
							>
								{f.type}:{f.type === 'lang' ? f.value : f.label}
								<X className="size-3" />
							</FilterPill>
						))}
						{Array.from(typeFilters).map((t) => (
							<FilterPill
								key={`type-${t}`}
								active
								onClick={() => toggleTypeFilter(t)}
							>
								{t}s only
								<X className="size-3" />
							</FilterPill>
						))}
						<button
							onClick={clearAll}
							className="s-link text-muted-foreground cursor-pointer text-xs"
						>
							Clear all
						</button>
					</div>
				)}

				{/* Filter suggestions */}
				{parsed.suggestions.length > 0 && (
					<div className="flex flex-wrap items-center gap-2 px-4 pt-2">
						<span className="text-muted-foreground text-xs">Add filter:</span>
						{parsed.suggestions.map((s) => (
							<FilterPill
								key={`${s.type}-${s.value}`}
								onClick={() => addFilter(s)}
							>
								<Plus className="size-3" />
								{s.type}:{s.type === 'lang' ? s.value : s.label}
							</FilterPill>
						))}
					</div>
				)}

				{/* Type filter pills (when searching) */}
				{hasActiveSearch && (
					<div className="flex flex-wrap items-center gap-2 px-4 pt-2">
						<span className="text-muted-foreground text-xs">Show:</span>
						{(
							[
								{
									type: 'phrase' as const,
									icon: <MessageSquareQuote className="size-3" />,
								},
								{
									type: 'playlist' as const,
									icon: <ListMusic className="size-3" />,
								},
								{
									type: 'request' as const,
									icon: <MessageCircleHeart className="size-3" />,
								},
							] as const
						).map(({ type, icon }) => (
							<FilterPill
								key={type}
								active={typeFilters.size === 0 || typeFilters.has(type)}
								onClick={() => toggleTypeFilter(type)}
							>
								{icon}
								{type}s
							</FilterPill>
						))}
					</div>
				)}

				{/* Search input */}
				<div className="p-3">
					<div className="relative flex items-center gap-2">
						<Button
							variant={showQuickFilters ? 'soft' : 'ghost'}
							size="icon"
							onClick={() => setShowQuickFilters(!showQuickFilters)}
							data-testid="quick-filters-toggle"
						>
							<SlidersHorizontal className="size-4" />
						</Button>
						<div className="relative flex-1">
							<Search className="text-muted-foreground absolute start-3 top-1/2 size-4 -translate-y-1/2" />
							<Input
								data-testid="search-input"
								value={inputText}
								onChange={(e) => setInputText(e.target.value)}
								placeholder="Search phrases, playlists, and requests..."
								className="ps-9"
							/>
						</div>
					</div>
					<p className="text-muted-foreground ms-12 mt-1.5 text-xs">
						Try: &lsquo;hello in spanish&rsquo; or &lsquo;calling a cab in
						kannada&rsquo;
					</p>
				</div>
			</div>
		</div>
	)
}

// --- Sub-components ---

function SystemMessage({ children }: { children: ReactNode }) {
	return (
		<div className="flex items-start gap-2.5">
			<div className="bg-1-mlo-primary mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full">
				<Sparkles className="text-7-hi-primary size-3.5" />
			</div>
			<p className="text-muted-foreground pt-1 text-sm">{children}</p>
		</div>
	)
}

/** Reusable filter pill — matches browse-search-overlay toggle style */
function FilterPill({
	active,
	onClick,
	children,
}: {
	active?: boolean
	onClick: () => void
	children: ReactNode
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				'inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
				active
					? 'bg-primary-foresoft text-primary-foreground border-transparent'
					: 'border-border text-muted-foreground hover:border-4-mlo-primary hover:text-foreground'
			)}
		>
			{children}
		</button>
	)
}

function EmptyResults() {
	return (
		<div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
			<div className="bg-1-mlo-neutral mx-auto flex size-24 items-center justify-center rounded-full">
				<SearchX className="text-5-mid-neutral size-12" />
			</div>
			<div className="space-y-1">
				<p className="text-lg font-semibold">No results found</p>
				<p className="text-muted-foreground mx-auto max-w-xs text-sm">
					Nothing matched your search. Try different keywords, remove a filter,
					or explore a new language.
				</p>
			</div>
		</div>
	)
}

function TypeBadge({ type }: { type: SearchEntityType }) {
	const icon =
		type === 'phrase' ? (
			<MessageSquareQuote className="size-3" />
		) : type === 'playlist' ? (
			<ListMusic className="size-3" />
		) : (
			<MessageCircleHeart className="size-3" />
		)

	return (
		<span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs capitalize">
			{icon}
			{type}
		</span>
	)
}

function PhraseResultRow({
	phrase,
	diagnostic = false,
}: {
	phrase: HybridSearchResult
	diagnostic?: boolean
}) {
	const translations = phrase.translations_mine?.length
		? phrase.translations_mine
		: phrase.translations_other?.filter((t) => t.lang === 'eng').length
			? phrase.translations_other.filter((t) => t.lang === 'eng')
			: (phrase.translations_other ?? phrase.translations ?? [])

	return (
		<Link
			to="/learn/$lang/phrases/$id"
			params={{ lang: phrase.lang, id: phrase.id }}
			className="hover:bg-muted/50 flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors"
		>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<LangBadge lang={phrase.lang} />
					<span className="truncate font-semibold">
						&ldquo;{phrase.text}&rdquo;
					</span>
				</div>
				{translations.length > 0 && (
					<p className="text-muted-foreground mt-1 truncate text-sm">
						{translations
							.slice(0, 2)
							.map((t) => t.text)
							.join(' · ')}
					</p>
				)}
				{phrase.tags && phrase.tags.length > 0 && (
					<div className="mt-1.5 flex flex-wrap gap-1">
						{phrase.tags.slice(0, 3).map((tag) => (
							<Badge key={tag.id} variant="outline" size="sm">
								{tag.name}
							</Badge>
						))}
					</div>
				)}
			</div>
			<div className="flex shrink-0 items-start gap-3">
				{(phrase.count_learners ?? 0) > 0 && (
					<span
						className="text-muted-foreground/60 mt-0.5 flex items-center gap-0.5 text-xs"
						title={`${phrase.count_learners} learner${phrase.count_learners !== 1 ? 's' : ''}`}
					>
						<Users size={10} />
						{phrase.count_learners}
					</span>
				)}
				<div className="flex flex-col items-end gap-1">
					<TypeBadge type="phrase" />
					{diagnostic && (
						<ScoreBreakdown
							semantic={phrase.semanticScore ?? 0}
							trigram={phrase.similarityScore ?? 0}
						/>
					)}
				</div>
			</div>
		</Link>
	)
}

const fmt2 = (n: number) => n.toFixed(2)

function ScoreBreakdown({
	semantic,
	trigram = 0,
}: {
	semantic: number
	trigram?: number
}) {
	const semContribution = Math.sqrt(semantic)
	const triContribution = Math.sqrt(trigram)
	const combined = combinedScore(semantic, trigram)
	return (
		<div className="text-muted-foreground/70 flex flex-col items-end gap-0 font-mono text-[10px] leading-tight tabular-nums">
			<span>
				Ω {fmt2(semantic)} → {fmt2(semContribution)}
			</span>
			<span>
				Δ {fmt2(trigram)} → {fmt2(triContribution)}
			</span>
			<span className="text-foreground font-semibold">Σ {fmt2(combined)}</span>
		</div>
	)
}

function EntityResultRow({
	type,
	entity,
	diagnostic = false,
	semanticScore = 0,
	trigramScore = 0,
}: {
	type: 'playlist' | 'request'
	entity: PhrasePlaylistType | PhraseRequestType
	diagnostic?: boolean
	semanticScore?: number
	trigramScore?: number
}) {
	const title =
		type === 'playlist'
			? (entity as PhrasePlaylistType).title
			: (entity as PhraseRequestType).prompt
	const subtitle =
		type === 'playlist' ? (entity as PhrasePlaylistType).description : null
	const linkClass =
		'hover:bg-muted/50 flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors'

	const body = (
		<>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<LangBadge lang={entity.lang} />
					<span className="truncate font-semibold">{title}</span>
				</div>
				{subtitle && (
					<p className="text-muted-foreground mt-1 truncate text-sm">
						{subtitle}
					</p>
				)}
			</div>
			<div className="flex shrink-0 items-start gap-3">
				{entity.upvote_count > 0 && (
					<span className="text-muted-foreground/60 mt-0.5 flex items-center gap-0.5 text-xs">
						<ArrowUp size={10} />
						{entity.upvote_count}
					</span>
				)}
				<div className="flex flex-col items-end gap-1">
					<TypeBadge type={type} />
					{diagnostic && (
						<ScoreBreakdown semantic={semanticScore} trigram={trigramScore} />
					)}
				</div>
			</div>
		</>
	)

	if (type === 'playlist') {
		return (
			<Link
				to="/learn/$lang/playlists/$playlistId"
				params={{ lang: entity.lang, playlistId: entity.id }}
				className={linkClass}
			>
				{body}
			</Link>
		)
	}
	return (
		<Link
			to="/learn/$lang/requests/$id"
			params={{ lang: entity.lang, id: entity.id }}
			className={linkClass}
		>
			{body}
		</Link>
	)
}

function WelcomeState({
	onSelectLanguage,
	onSelectLangTag,
	languages: availableLanguages,
	tags,
}: {
	onSelectLanguage: (code: string, name: string) => void
	onSelectLangTag: (lang: string, tagName: string) => void
	languages: Array<LanguageType>
	tags: Array<LangTagType>
}) {
	return (
		<div className="flex h-full flex-col items-center justify-center space-y-8 p-6">
			<div className="space-y-3 text-center">
				<div className="bg-1-mlo-primary mx-auto mb-4 flex size-16 items-center justify-center rounded-full">
					<MessageCircle className="text-7-hi-primary size-8" />
				</div>
				<h2 className="h3">What are you looking for?</h2>
				<p className="text-muted-foreground mx-auto max-w-sm text-sm">
					Search phrases, playlists, and requests across all languages, or pick
					a language and category to explore.
				</p>
			</div>

			{availableLanguages.length > 0 && (
				<div className="w-full max-w-md space-y-2">
					<h3 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
						Languages
					</h3>
					<div className="flex flex-wrap gap-1.5">
						{availableLanguages.slice(0, 8).map((lang) => (
							<FilterPill
								key={lang.lang}
								onClick={() => onSelectLanguage(lang.lang, lang.name)}
							>
								{lang.name}
								<span className="opacity-60">{lang.phrases_to_learn}</span>
							</FilterPill>
						))}
					</div>
				</div>
			)}

			{tags.length > 0 && (
				<div className="w-full max-w-md space-y-2">
					<h3 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
						Categories
					</h3>
					<div className="flex flex-wrap gap-1.5">
						{tags.slice(0, 12).map((tag) => (
							<FilterPill
								key={`${tag.lang}:${tag.name}`}
								onClick={() => onSelectLangTag(tag.lang, tag.name)}
							>
								{tag.lang}: {tag.name}
							</FilterPill>
						))}
					</div>
				</div>
			)}
		</div>
	)
}

function QuickFiltersPanel({
	languages: availableLanguages,
	tags,
	langFilter,
	filters,
	onAddFilter,
	onRemoveFilter,
	onClose,
}: {
	languages: Array<LanguageType>
	tags: Array<LangTagType>
	langFilter: string | undefined
	filters: Array<SearchFilter>
	onAddFilter: (filter: SearchFilter) => void
	onRemoveFilter: (filter: SearchFilter) => void
	onClose: () => void
}) {
	const activeLang = filters.find((f) => f.type === 'lang')?.value
	const activeTags = new Set(
		filters.filter((f) => f.type === 'tag').map((f) => f.value)
	)

	// Filter tags to selected language, or show all with prefix
	const displayTags = langFilter
		? tags.filter((t) => t.lang === langFilter)
		: tags

	return (
		<div className="max-h-64 space-y-4 overflow-y-auto border-t p-4">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-medium">Quick Filters</h3>
				<Button variant="ghost" size="icon" onClick={onClose}>
					<X className="size-4" />
				</Button>
			</div>

			<div className="space-y-2">
				<h4 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
					Languages
				</h4>
				<div className="flex flex-wrap gap-1.5">
					{availableLanguages.slice(0, 12).map((lang) => {
						const isActive = activeLang === lang.lang
						return (
							<FilterPill
								key={lang.lang}
								active={isActive}
								onClick={() =>
									isActive
										? onRemoveFilter({
												type: 'lang',
												value: lang.lang,
												label: lang.name,
											})
										: onAddFilter({
												type: 'lang',
												value: lang.lang,
												label: lang.name,
											})
								}
							>
								{lang.name}
							</FilterPill>
						)
					})}
				</div>
			</div>

			{displayTags.length > 0 && (
				<div className="space-y-2">
					<h4 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
						Categories{langFilter ? '' : ' (select a language to narrow)'}
					</h4>
					<div className="flex flex-wrap gap-1.5">
						{displayTags.slice(0, 12).map((tag) => {
							const isActive = activeTags.has(tag.name)
							return (
								<FilterPill
									key={`${tag.lang}:${tag.name}`}
									active={isActive}
									onClick={() => {
										if (isActive) {
											onRemoveFilter({
												type: 'tag',
												value: tag.name,
												label: tag.name,
											})
										} else {
											// If no lang filter, also set the lang
											if (!langFilter) {
												onAddFilter({
													type: 'lang',
													value: tag.lang,
													label: allLanguages[tag.lang] ?? tag.lang,
												})
											}
											onAddFilter({
												type: 'tag',
												value: tag.name,
												label: tag.name,
											})
										}
									}}
								>
									{langFilter ? tag.name : `${tag.lang}: ${tag.name}`}
								</FilterPill>
							)
						})}
					</div>
				</div>
			)}
		</div>
	)
}
