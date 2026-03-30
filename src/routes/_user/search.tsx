import { useState, useMemo, useRef, useEffect, type ReactNode } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import { useDebounce } from '@/hooks/use-debounce'
import { eq, ilike } from '@tanstack/db'
import { useLiveQuery } from '@tanstack/react-db'
import {
	Search,
	SlidersHorizontal,
	X,
	Plus,
	Sparkles,
	MessageCircle,
	Users,
	SearchX,
} from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge, LangBadge } from '@/components/ui/badge'
import { CardlikeFlashcard } from '@/components/ui/card-like'
import { CardStatusHeart } from '@/components/card-pieces/card-status-dropdown'
import PermalinkButton from '@/components/permalink-button'
import allLanguages from '@/lib/languages'
import type { PhraseFullFilteredType } from '@/features/phrases/schemas'
import { cn } from '@/lib/utils'
import { phrasesFull } from '@/features/phrases/live'
import {
	languagesCollection,
	langTagsCollection,
} from '@/features/languages/collections'
import { useLanguagesToShow } from '@/features/profile/hooks'
import { splitPhraseTranslations } from '@/hooks/composite-phrase'
import type { LanguageType, LangTagType } from '@/features/languages/schemas'

import { parseSearchInput, type SearchFilter } from '@/lib/parse-search-input'

// --- Route ---

const SearchParams = z.object({
	q: z.string().optional(),
	langs: z.string().optional(),
})

export const Route = createFileRoute('/_user/search')({
	component: SearchPage,
	validateSearch: SearchParams,
	beforeLoad: () => ({
		titleBar: {
			title: 'Phrase Finder',
			subtitle: 'Search across all languages',
		},
		appnav: [],
		fixedHeight: true,
	}),
})

// --- Main Component ---

function SearchPage() {
	const { q: initialQuery, langs: initialLangs } = Route.useSearch()

	const [inputText, setInputText] = useState(initialQuery ?? '')
	const debouncedText = useDebounce(inputText, 150)
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
	const scrollRef = useRef<HTMLDivElement>(null)

	const { data: languagesToShow } = useLanguagesToShow()

	// Derive explicit filter values
	const langFilter = filters.find((f) => f.type === 'lang')?.value
	const tagFilters = filters.filter((f) => f.type === 'tag').map((f) => f.value)

	// Languages that have phrases
	const { data: availableLanguages } = useLiveQuery(
		(q) =>
			q
				.from({ lang: languagesCollection })
				.fn.where(({ lang }) => (lang.phrases_to_learn ?? 0) > 0),
		[]
	)

	const sortedLanguages = useMemo(
		() =>
			[...(availableLanguages ?? [])].toSorted(
				(a, b) => (b.phrases_to_learn ?? 0) - (a.phrases_to_learn ?? 0)
			),
		[availableLanguages]
	)

	// All tags (per-language)
	const { data: allTags } = useLiveQuery(
		(q) => q.from({ tag: langTagsCollection }),
		[]
	)

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
		() => parseSearchInput(debouncedText, filters, uniqueTagNames),
		[debouncedText, filters, uniqueTagNames]
	)

	const effectiveText = parsed.effectiveText

	const hasActiveSearch = !!(
		effectiveText.length >= 2 ||
		langFilter ||
		tagFilters.length > 0
	)

	// Live search query across all phrases
	const { data: results } = useLiveQuery(
		(q) => {
			if (!hasActiveSearch) return undefined

			let query = q.from({ phrase: phrasesFull })

			if (langFilter) {
				query = query.where(({ phrase }) => eq(phrase.lang, langFilter))
			}
			if (effectiveText.length >= 2) {
				query = query.where(({ phrase }) =>
					ilike(phrase.searchableText, `%${effectiveText}%`)
				)
			}
			if (tagFilters.length > 0) {
				query = query.fn.where(({ phrase }) => {
					if (!phrase?.tags) return false
					return tagFilters.every((tag) =>
						(phrase.tags ?? []).some((t) => t?.name === tag)
					)
				})
			}

			return query.fn.select(({ phrase }) =>
				splitPhraseTranslations(phrase, languagesToShow)
			)
		},
		[langFilter, effectiveText, tagFilters, languagesToShow, hasActiveSearch]
	)

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
		setInputText('')
	}

	// Scroll to top when filters change
	useEffect(() => {
		scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
	}, [langFilter, tagFilters.length])

	// Build status message
	const statusMessage = useMemo(() => {
		if (!hasActiveSearch) return null
		if (!results) return 'Searching...'
		if (results.length === 0) return null // handled by EmptyResults

		const parts: Array<string> = [
			`Found ${results.length} phrase${results.length !== 1 ? 's' : ''}`,
		]
		if (langFilter) parts.push(`in ${allLanguages[langFilter] ?? langFilter}`)
		if (effectiveText.length >= 2) parts.push(`matching "${effectiveText}"`)
		return parts.join(' ')
	}, [hasActiveSearch, results, langFilter, effectiveText])

	return (
		<div className="flex h-full flex-col" data-testid="phrase-finder-page">
			{/* Scrollable content area */}
			<div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
				{!hasActiveSearch ?
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
				:	<div className="space-y-4 p-4">
						{statusMessage && <SystemMessage>{statusMessage}</SystemMessage>}
						{results && results.length === 0 && <EmptyResults />}
						{results && results.length > 0 && (
							<div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
								{results.slice(0, 60).map((phrase) => (
									<PhraseResultCard key={phrase.id} phrase={phrase} />
								))}
							</div>
						)}
					</div>
				}
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

				{/* Active filters */}
				{filters.length > 0 && (
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
								placeholder="Search phrases in any language..."
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
				active ?
					'bg-primary-foresoft text-primary-foreground border-transparent'
				:	'border-border text-muted-foreground hover:border-4-mlo-primary hover:text-foreground'
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
				<p className="text-lg font-semibold">No phrases found</p>
				<p className="text-muted-foreground mx-auto max-w-xs text-sm">
					Nothing matched your search. Try different keywords, remove a filter,
					or explore a new language.
				</p>
			</div>
		</div>
	)
}

function PhraseResultCard({ phrase }: { phrase: PhraseFullFilteredType }) {
	// Prefer user's languages, fall back to English, then any translation
	const translations =
		phrase.translations_mine?.length ? phrase.translations_mine
		: phrase.translations_other?.filter((t) => t.lang === 'eng').length ?
			phrase.translations_other.filter((t) => t.lang === 'eng')
		:	(phrase.translations_other ?? phrase.translations ?? [])

	return (
		<CardlikeFlashcard className="flex flex-row gap-2 py-0 ps-4 pe-1">
			<div className="grow py-4">
				<div className="space-x-2 pb-1">
					<LangBadge lang={phrase.lang} />
					<span className="inline-flex gap-2 align-baseline font-semibold">
						&ldquo;{phrase.text}&rdquo;
					</span>
				</div>
				<ul className="mt-1 space-y-0.5">
					{translations.slice(0, 3).map((t) => (
						<li key={t.id} className="flex items-center gap-2 text-sm">
							<LangBadge lang={t.lang} />
							<span>{t.text}</span>
						</li>
					))}
				</ul>
				{phrase.tags && phrase.tags.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-1">
						{phrase.tags.slice(0, 3).map((tag) => (
							<Badge key={tag.id} variant="outline" size="sm">
								{tag.name}
							</Badge>
						))}
					</div>
				)}
			</div>
			<div className="flex flex-col gap-2 px-4 py-4">
				<CardStatusHeart phrase={phrase} />
				<PermalinkButton
					to="/learn/$lang/phrases/$id"
					params={{ lang: phrase.lang, id: phrase.id }}
					variant="ghost"
					size="icon"
					aria-label="View full phrase info"
					text=""
				/>
				{(phrase.count_learners ?? 0) > 0 && (
					<span
						className="text-muted-foreground/60 flex items-center gap-0.5 text-xs"
						title={`${phrase.count_learners} learner${phrase.count_learners !== 1 ? 's' : ''}`}
					>
						<Users size={10} />
						{phrase.count_learners}
					</span>
				)}
			</div>
		</CardlikeFlashcard>
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
					Search phrases across all languages, or pick a language and category
					to explore.
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
	const displayTags =
		langFilter ? tags.filter((t) => t.lang === langFilter) : tags

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
									isActive ?
										onRemoveFilter({
											type: 'lang',
											value: lang.lang,
											label: lang.name,
										})
									:	onAddFilter({
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
