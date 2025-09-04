import { useMemo, type SetStateAction } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { Plus, SearchX } from 'lucide-react'

import languages from '@/lib/languages'
import { Badge } from '@/components/ui/badge'
import Callout from '@/components/ui/callout'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader } from '@/components/ui/loader'
import { FancyMultiSelect } from '@/components/ui/multi-select'
import { Separator } from '@/components/ui/separator'
import { LanguageIsEmpty } from '@/components/language-is-empty'
import { LanguagePhrasesAccordionComponent } from '@/components/language-phrases-accordion'
import { useLanguage } from '@/lib/use-language'
import { useCompositePids } from '@/hooks/use-processed-data'
import { useDeckPids } from '@/lib/use-deck'

const filterEnum = z.enum([
	'language_filtered',
	'active',
	'inactive',
	'reviewed_last_7d',
	'not_in_deck',
	'language_no_translations',
	'language',
])
type FilterEnum = z.infer<typeof filterEnum>

const SearchSchema = z.object({
	filter: filterEnum.optional(),
	tags: z.string().optional(),
})

export const Route = createFileRoute('/_user/learn/$lang/library')({
	component: DeckLibraryPage,
	validateSearch: SearchSchema,
})

function DeckLibraryPage() {
	const { lang } = Route.useParams()

	const { data: deckPids } = useDeckPids(lang)
	const recs = useCompositePids(lang)
	const search = Route.useSearch()
	const navigate = useNavigate({ from: Route.fullPath })
	const { data: language } = useLanguage(lang)

	if (!recs || !deckPids || !language) return <Loader />

	const filter = search.filter || 'not_in_deck'
	const tagsFilter = search.tags

	const allTags = language?.meta.tags ?? []
	const tagOptions = useMemo(
		() => allTags?.map((tag) => ({ value: tag, label: tag })) ?? [],
		[allTags]
	)

	const selectedTags = useMemo(
		() => (tagsFilter ? tagsFilter.split(',').filter(Boolean) : []),
		[tagsFilter]
	)

	const setSelectedTags = (value: SetStateAction<string[]>) => {
		const newSelectedTags =
			typeof value === 'function' ? value(selectedTags) : value
		void navigate({
			search: (prev) => ({
				...prev,
				tags: newSelectedTags.length ? newSelectedTags.join(',') : undefined,
			}),
			replace: true,
			params: true,
		})
	}

	const filteredPidsByStatus =
		filter === 'language' ? recs['language']
		: filter === 'language_filtered' ? recs['language_filtered']
		: filter === 'language_no_translations' ? recs['language_no_translations']
		: filter === 'not_in_deck' ? recs['not_in_deck']
		: filter === 'active' ? deckPids['active']
		: filter === 'inactive' ? deckPids['inactive']
		: filter === 'reviewed_last_7d' ? deckPids['reviewed_last_7d']
		: []
	const filteredPids = useMemo(() => {
		if (!tagsFilter) return filteredPidsByStatus
		if (!language?.phrasesMap) return []

		const selectedTags = tagsFilter.split(',').map((t) => t.trim())
		if (selectedTags.length === 0) return filteredPidsByStatus

		return filteredPidsByStatus.filter((pid) => {
			const phrase = language.phrasesMap[pid]
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (!phrase || !phrase.tags) return false
			return selectedTags.every((selectedTag) =>
				phrase.tags?.some(
					(phraseTag: { name: string }) => phraseTag.name === selectedTag
				)
			)
		})
	}, [filteredPidsByStatus, tagsFilter, language?.phrasesMap])

	if (!deckPids || !recs) {
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
							params={{ lang }}
							className={buttonVariants({
								size: 'badge',
								variant: 'outline',
							})}
						>
							<Plus className="size-3" />
							<span className="me-1">new phrase</span>
						</Link>
					</div>
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="text-muted-foreground mb-4 flex flex-row flex-wrap gap-2">
					<span className="text-sm">Filters:</span>
					<BadgeFilter
						name="language_filtered"
						filter={filter}
						text="All phrases"
						count={recs.language_filtered.length}
					/>
					<BadgeFilter
						name="active"
						filter={filter}
						text="Active deck"
						count={deckPids.active.length}
					/>
					<BadgeFilter
						name="inactive"
						filter={filter}
						text="Inactive"
						count={deckPids.inactive.length}
					/>
					{/*<BadgeFilter
						name="recommended"
						filter={filter}
						text="Recommended"
						count={pids.recommended.length}
					/>*/}
					<BadgeFilter
						name="not_in_deck"
						filter={filter}
						text="Not in deck"
						count={recs.not_in_deck.length}
					/>
					<BadgeFilter
						name="reviewed_last_7d"
						filter={filter}
						text="Reviewed past week"
						count={deckPids.reviewed_last_7d.length}
					/>
					<BadgeFilter
						name="language_no_translations"
						filter={filter}
						text="Needs translations"
						count={recs.language_no_translations.length}
					/>
					<BadgeFilter
						name="language"
						filter={filter}
						text="No filters"
						count={recs.language.length}
					/>
				</div>
				<div className="mb-4">
					<FancyMultiSelect
						options={tagOptions}
						selected={selectedTags}
						setSelected={setSelectedTags}
						placeholder="Filter by tags..."
					/>
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

const constFilter = { filter: 'language' } as const

function Empty() {
	const { lang } = Route.useParams()
	return (
		<Callout variant="ghost" Icon={SearchX}>
			<p>There are no phrases in the library that match this search.</p>
			<Link
				className={buttonVariants({ variant: 'outline' })}
				to="/learn/$lang/library"
				params={{ lang }}
				search={constFilter}
			>
				Clear filters
			</Link>
		</Callout>
	)
}

function BadgeFilter({
	name,
	text,
	filter,
	count = 0,
}: {
	name: FilterEnum
	text: string
	filter: FilterEnum
	count: number
}) {
	const constFilter = { filter: name } as const
	const lang = Route.useParams({ select: (d) => d.lang })
	return (
		<Link to="/learn/$lang/library" params={{ lang }} search={constFilter}>
			<Badge variant="outline" className="shadow-sm">
				<label className="flex cursor-pointer gap-1">
					<Checkbox checked={filter === name} /> {text} ({count})
				</label>
			</Badge>
		</Link>
	)
}
