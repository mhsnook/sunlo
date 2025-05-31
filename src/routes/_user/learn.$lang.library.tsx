import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import languages from '@/lib/languages'
import type { LangOnlyComponentProps } from '@/types/main'
import { LanguagePhrasesAccordionComponent } from '@/components/language-phrases-accordion'
import Callout from '@/components/ui/callout'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, SearchX } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { useDeckPidsAndRecs } from '@/lib/process-pids'
import { LanguageIsEmpty } from '@/components/language-is-empty'
import { z } from 'zod'

const filterEnum = z.enum([
	'language_filtered',
	'active',
	'inactive',
	'reviewed_last_7d',
	'not_in_deck',
	'language_no_translations',
	'language',
])
const SearchSchema = z.object({ filter: filterEnum.optional() })

export const Route = createFileRoute('/_user/learn/$lang/library')({
	component: DeckLibraryPage,
	validateSearch: SearchSchema,
})

function DeckLibraryPage() {
	const { lang } = Route.useParams()

	return (
		<div className="space-y-4 px-2">
			<DeckContents lang={lang} />
		</div>
	)
}

type FilterEnum = z.infer<typeof filterEnum>

function DeckContents({ lang }: LangOnlyComponentProps) {
	const pids = useDeckPidsAndRecs(lang)
	const search = Route.useSearch()
	const filter = search.filter || 'not_in_deck'
	if (!pids) {
		console.log(
			'Trying to render DeckContents but not getting anything for the recommended pids object'
		)
		return null
	}

	const filteredPids = pids[filter]

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

function Empty() {
	const { lang } = Route.useParams()
	return (
		<Callout variant="ghost" Icon={() => <SearchX />}>
			<p>There are no phrases in the library that match this search.</p>
			<Link
				className={buttonVariants({ variant: 'outline' })}
				to="/learn/$lang/library"
				params={{ lang }}
				search={{ filter: 'language' }}
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
	const lang = Route.useParams({ select: (d) => d.lang })
	return (
		<Link to="/learn/$lang/library" params={{ lang }} search={{ filter: name }}>
			<Badge variant="outline">
				<label className="flex cursor-pointer gap-1">
					<Checkbox checked={filter === name} /> {text} ({count})
				</label>
			</Badge>
		</Link>
	)
}
