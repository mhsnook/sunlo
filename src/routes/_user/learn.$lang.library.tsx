import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import languages from '@/lib/languages'
import type { LangOnlyComponentProps } from '@/types/main'
import { LanguagePhrasesAccordionComponent } from '@/components/language-phrases-accordion'
import Callout from '@/components/ui/callout'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, SearchX } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { useDeckPidsAndRecs } from '@/lib/process-pids'
import { LanguageIsEmpty } from '@/components/language-is-empty'
import { useLanguage } from '@/lib/use-language'
import { z } from 'zod'
import { useMemo } from 'react'

const filterEnum = z.enum([
	'language_filtered',
	'active',
	'inactive',
	'reviewed_last_7d',
	'not_in_deck',
	'language_no_translations',
	'language',
])
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

	return (
		<div className="space-y-4">
			<DeckContents lang={lang} />
		</div>
	)
}

type FilterEnum = z.infer<typeof filterEnum>

function DeckContents({ lang }: LangOnlyComponentProps) {
	const pids = useDeckPidsAndRecs(lang)
	const search = Route.useSearch()
	const navigate = Route.useNavigate()
	const { data: language } = useLanguage(lang)
	const filter = search.filter || 'not_in_deck'
	const tagsFilter = search.tags

	const filteredPidsByStatus = pids[filter]

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
				phrase.tags.some(
					(phraseTag: { name: string }) => phraseTag.name === selectedTag
				)
			)
		})
	}, [filteredPidsByStatus, tagsFilter, language?.phrasesMap])

	if (!pids) {
		console.log(
			'Trying to render DeckContents but not getting anything for the recommended pids object'
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
						count={pids.language_filtered.length}
					/>
					<BadgeFilter
						name="active"
						filter={filter}
						text="Active deck"
						count={pids.active.length}
					/>
					<BadgeFilter
						name="inactive"
						filter={filter}
						text="Inactive"
						count={pids.inactive.length}
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
						count={pids.not_in_deck.length}
					/>
					<BadgeFilter
						name="reviewed_last_7d"
						filter={filter}
						text="Reviewed past week"
						count={pids.reviewed_last_7d.length}
					/>
					<BadgeFilter
						name="language_no_translations"
						filter={filter}
						text="Needs translations"
						count={pids.language_no_translations.length}
					/>
					<BadgeFilter
						name="language"
						filter={filter}
						text="No filters"
						count={pids.language.length}
					/>
				</div>
				<div className="mb-4">
					<Label htmlFor="tags-filter">Filter by tags (comma-separated)</Label>
					<Input
						id="tags-filter"
						placeholder="e.g. greeting, food"
						defaultValue={tagsFilter}
						onChange={(e) => {
							// This should probably be debounced.
							void navigate({
								search: (prev) => ({
									...prev,
									tags: e.target.value || undefined,
								}),
								replace: true,
								params: true,
							})
						}}
					/>
				</div>
				{pids.language.length > 0 ?
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
			<Badge variant="outline">
				<label className="flex cursor-pointer gap-1">
					<Checkbox checked={filter === name} /> {text} ({count})
				</label>
			</Badge>
		</Link>
	)
}
