import { useCallback, useMemo, type SetStateAction } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Plus, SearchX } from 'lucide-react'

import languages from '@/lib/languages'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FancyMultiSelect, ShowSelected } from '@/components/ui/multi-select'
import { Separator } from '@/components/ui/separator'
import { LanguageIsEmpty } from '@/components/language-is-empty'
import { LanguagePhrasesAccordionComponent } from '@/components/language-phrases-accordion'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { useLanguageMeta, useLanguagePhrases } from '@/hooks/use-language'
import { useCompositePids } from '@/hooks/composite-pids'
import { useDeckPids } from '@/hooks/use-deck'
import { FilterEnumType, PhraseSearchSchema } from '@/lib/schemas'
import { Label } from '@/components/ui/label'

type DeckOnlyFiltersEnum = 'active' | 'inactive' | 'reviewed_last_7d'
type CompositeFiltersEnum = Exclude<FilterEnumType, DeckOnlyFiltersEnum>

export const Route = createFileRoute('/_user/learn/$lang/library')({
	component: DeckLibraryPage,
	validateSearch: PhraseSearchSchema,
})

const filterLanguage = {
	filter: 'language' as const,
}

function DeckLibraryPage() {
	const { lang } = Route.useParams()
	const { data: deckPids } = useDeckPids(lang)
	const recs = useCompositePids(lang)
	const search = Route.useSearch()
	const navigate = useNavigate({ from: Route.fullPath })
	const { data: languageMeta } = useLanguageMeta(lang)
	const { state: languagePhrasesMap } = useLanguagePhrases(lang)

	const filter = search.filter || 'not_in_deck'
	const tagsFilter = search.tags

	const tagOptions = useMemo(
		() =>
			!languageMeta ?
				[]
			:	languageMeta.tags.map((tag) => ({ value: tag, label: tag })),
		[languageMeta]
	)

	const selectedTags = useMemo(
		() => (tagsFilter ? tagsFilter.split(',').filter(Boolean) : []),
		[tagsFilter]
	)

	const setSelectedTags = useCallback(
		(value: SetStateAction<string[]>) => {
			void navigate({
				search: (prev) => {
					const currentTags = prev.tags?.split(',').filter(Boolean) ?? []
					const newTags =
						typeof value === 'function' ? value(currentTags) : value
					return {
						...prev,
						tags: newTags.length ? newTags.join(',') : undefined,
					}
				},
				replace: true,
				params: true,
			})
		},
		[navigate]
	)

	const filterOptions = useMemo(() => {
		if (!deckPids || !recs) return []
		return [
			{
				value: 'not_in_deck',
				label: `Phrases not in deck (${recs.not_in_deck.length})`,
			},
			{
				value: 'active',
				label: `Active cards (${deckPids.active.length})`,
			},
			{
				value: 'inactive',
				label: `Inactive cards (${deckPids.inactive.length})`,
			},
			{
				value: 'reviewed_last_7d',
				label: `Reviewed past week (${deckPids.reviewed_last_7d.length})`,
			},
			{
				value: 'language_filtered',
				label: `All phrases (${recs.language_filtered.length})`,
			},
			{
				value: 'language_no_translations',
				label: `Needs translations (${recs.language_no_translations.length})`,
			},
			{ value: 'language', label: `No filters (${recs.language.length})` },
		]
	}, [deckPids, recs])

	const handleFilterChange = useCallback(
		(value: string) => {
			void navigate({
				search: (prev) => ({ ...prev, filter: value as FilterEnumType }),
				replace: true,
			})
		},
		[navigate]
	)

	const filteredPidsByStatus = useMemo(
		() =>
			!deckPids || !recs ? []
			: filter in deckPids ? deckPids[filter as DeckOnlyFiltersEnum]
			: recs[filter as CompositeFiltersEnum],
		[filter, recs, deckPids]
	)

	const filteredPids = useMemo(() => {
		if (!languagePhrasesMap || filteredPidsByStatus.length === 0) return []
		if (!tagsFilter?.trim()) return filteredPidsByStatus

		const selectedTags = tagsFilter
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean)
		if (selectedTags.length === 0) return filteredPidsByStatus

		return filteredPidsByStatus.filter((pid) => {
			const phrase = languagePhrasesMap.get(pid)
			const phraseTags = phrase?.tags?.map((t) => t.name) ?? []
			return selectedTags.every((selectedTag) =>
				phraseTags.includes(selectedTag)
			)
		})
	}, [filteredPidsByStatus, tagsFilter, languagePhrasesMap])

	if (!deckPids || !recs || !languageMeta) {
		console.log(
			'Trying to render DeckContents but not getting anything for the recs or deckPids object'
		)
		return null
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<div className="flex flex-row justify-between gap-2">
						<span>Explore the {languages[lang]} Library</span>
						<Link
							to="/learn/$lang/add-phrase"
							from={Route.fullPath}
							className={`${buttonVariants({
								variant: 'outline',
							})} -mt-2`}
						>
							<Plus className="size-3" />
							<span className="me-1">new phrase</span>
						</Link>
					</div>
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 gap-4 @md:grid-cols-2">
					<div>
						<Label>Phrase Tags</Label>
						<FancyMultiSelect
							options={tagOptions}
							selected={selectedTags}
							setSelected={setSelectedTags}
							placeholder="Filter by tags..."
							showSelected={false}
						/>
					</div>
					<div>
						<Label>Card status</Label>
						<Select onValueChange={handleFilterChange} value={filter}>
							<SelectTrigger>
								<SelectValue placeholder="Filter phrases..." />
							</SelectTrigger>
							<SelectContent>
								{filterOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
				<div className="mt-2 flex flex-col items-center justify-between gap-2 @lg:flex-row">
					<div className="flex flex-row flex-wrap gap-2">
						<ShowSelected
							options={tagOptions}
							selected={selectedTags}
							setSelected={setSelectedTags}
						/>
					</div>
					<Link
						className={buttonVariants({ variant: 'outline', size: 'sm' })}
						to="/learn/$lang/library"
						from={Route.fullPath}
						search={filterLanguage}
					>
						Clear all filters
					</Link>
				</div>
				<Separator className="mt-6 mb-2" />
				<p className="text-muted-foreground pb-2 text-right text-xs italic">
					{filteredPids.length} of
					{recs.language.length} phrases
				</p>
				{recs.language.length > 0 ?
					<div className="flex-basis-[20rem] flex shrink flex-row flex-wrap gap-4">
						{filteredPids.length > 0 ?
							<LanguagePhrasesAccordionComponent
								pids={filteredPids}
								lang={lang}
							/>
						:	<Empty />}
					</div>
				:	<LanguageIsEmpty lang={lang} />}
			</CardContent>
		</Card>
	)
}

function Empty() {
	return (
		<div className="text-muted-foreground flex w-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-12">
			<SearchX className="size-12" />
			<div className="text-center">
				<p className="font-semibold">No phrases match your filters.</p>
				<p className="text-sm">Try adjusting your search.</p>
			</div>
		</div>
	)
}
