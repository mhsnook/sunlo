import { useEffect, useState, type SetStateAction } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useDebounce } from '@uidotdev/usehooks'
import { useInView } from 'react-intersection-observer'

import {
	ArrowDownWideNarrow,
	NotebookPen,
	Search,
	Sparkles,
} from 'lucide-react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FancyMultiSelect } from '@/components/ui/multi-select'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import languages from '@/lib/languages'
import { useLanguageTags } from '@/hooks/use-language'
import { Separator } from '@/components/ui/separator'
import { PhraseSearchSchema, PhraseSearchType } from '@/lib/schemas'
import {
	useSmartSearch,
	type SmartSearchSortBy,
} from '@/hooks/use-smart-search'
import { Accordion } from '@/components/ui/accordion'
import Callout from '@/components/ui/callout'
import { Loader } from '@/components/ui/loader'
import { PhraseAccordionItem } from '@/components/phrase-accordion-item'

export const Route = createFileRoute('/_user/learn/$lang/search')({
	validateSearch: PhraseSearchSchema,
	component: SearchTab,
})

function SearchTab() {
	const navigate = useNavigate({ from: Route.fullPath })
	const { lang } = Route.useParams()
	const { text: searchText, tags: tagsFilter, sort: sortBy } = Route.useSearch()
	const [liveText, setLiveText] = useState(searchText ?? '')
	const debouncedText = useDebounce(liveText, 100)

	// Sync debounced text to URL
	useEffect(() => {
		if (debouncedText !== searchText) {
			void navigate({
				search: (prev) => ({
					...prev,
					text: debouncedText || undefined,
				}),
				replace: true,
			})
		}
	}, [debouncedText, searchText, navigate])

	// Tags handling
	const { data: langTags } = useLanguageTags(lang)
	const tagOptions =
		(langTags ?? []).map((tag) => ({ value: tag.name, label: tag.name })) ?? []

	const selectedTags = tagsFilter ? tagsFilter.split(',').filter(Boolean) : []

	const setSelectedTags = (value: SetStateAction<string[]>) => {
		void navigate({
			search: (prev: PhraseSearchType) => {
				const newSelectedTags =
					typeof value === 'function' ? value(selectedTags) : value
				return {
					...prev,
					tags: newSelectedTags.length ? newSelectedTags.join(',') : undefined,
				}
			},
			replace: true,
			params: true,
		})
	}

	// Sort handling
	const currentSort: SmartSearchSortBy = sortBy ?? 'relevance'
	const setSortBy = (value: string) => {
		void navigate({
			search: (prev: PhraseSearchType) => ({
				...prev,
				sort: value === 'relevance' ? undefined : (value as SmartSearchSortBy),
			}),
			replace: true,
			params: true,
		})
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Sparkles className="size-5" />
					Smart Search {languages[lang]}
				</CardTitle>
				<CardDescription>
					Search phrases with fuzzy matching for transliterated text
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<div>
					<Label htmlFor="phrase">Phrase</Label>
					<Input
						placeholder="Enter a phrase to search or add"
						onChange={(e) => setLiveText(e.target.value)}
						defaultValue={searchText}
					/>
				</div>
				<FancyMultiSelect
					options={tagOptions}
					selected={selectedTags}
					setSelected={setSelectedTags}
					placeholder="Filter by tags..."
				/>
				<div className="flex flex-row gap-2">
					<Button type="submit">
						<Search /> Search Phrase
					</Button>
					<Button variant="secondary" asChild>
						<Link
							to="/learn/$lang/add-phrase"
							from={Route.fullPath}
							search={true}
						>
							<NotebookPen />
							Add New Phrase
						</Link>
					</Button>
				</div>
				<Separator />
				<SmartSearchResults
					lang={lang}
					query={liveText}
					sortBy={currentSort}
					setSortBy={setSortBy}
					selectedTags={selectedTags}
				/>
			</CardContent>
		</Card>
	)
}

function SmartSearchResults({
	lang,
	query,
	sortBy,
	setSortBy,
	selectedTags,
}: {
	lang: string
	query: string
	sortBy: SmartSearchSortBy
	setSortBy: (value: string) => void
	selectedTags: string[]
}) {
	const {
		data: results,
		isLoading,
		isEmpty,
		hasNextPage,
		fetchNextPage,
		isFetchingNextPage,
	} = useSmartSearch(lang, query, sortBy)

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

	// Filter by selected tags (client-side for now)
	const filteredResults =
		selectedTags.length > 0 ?
			results.filter((phrase) => {
				const phraseTags = new Set((phrase.tags ?? []).map((t) => t.name))
				return selectedTags.every((tag) => phraseTags.has(tag))
			})
		:	results

	if (!query || query.length < 2) {
		return (
			<Callout variant="ghost">Enter at least 2 characters to search</Callout>
		)
	}

	if (isLoading) {
		return <Loader />
	}

	if (isEmpty) {
		return <Callout variant="ghost">No phrases found.</Callout>
	}

	return (
		<>
			<div className="flex items-center justify-between">
				<p className="text-muted-foreground text-xs italic">
					{filteredResults.length} results
				</p>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm" className="gap-2">
							<ArrowDownWideNarrow className="size-4" />
							Sort: {sortBy === 'relevance' ? 'Relevance' : 'Popularity'}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
							<DropdownMenuRadioItem value="relevance">
								Relevance
							</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="popularity">
								Popularity
							</DropdownMenuRadioItem>
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			<Accordion type="single" collapsible className="w-full">
				{filteredResults.map((phrase) => (
					<PhraseAccordionItem key={phrase.id} phrase={phrase} />
				))}
			</Accordion>
			{/* Infinite scroll trigger */}
			{hasNextPage && (
				<div ref={loadMoreRef} className="flex justify-center py-4">
					{isFetchingNextPage && <Loader />}
				</div>
			)}
		</>
	)
}
