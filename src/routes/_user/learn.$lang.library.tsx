import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import languages from '@/lib/languages'
import type { LangOnlyComponentProps } from '@/types/main'
import { LanguagePhrasesAccordionComponent } from '@/components/language-phrases-accordion'
import Callout from '@/components/ui/callout'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { MessageSquarePlus, Plus, SearchX } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { useDeckPidsAndRecs } from '@/lib/process-pids'
import { Button } from '@/components/ui/button'
import { Garlic } from '@/components/garlic'

export const Route = createFileRoute('/_user/learn/$lang/library')({
	component: DeckLibraryPage,
})

function DeckLibraryPage() {
	const { lang } = Route.useParams()

	return (
		<div className="space-y-4 px-2">
			<DeckContents lang={lang} />
		</div>
	)
}

type FilterEnum =
	| 'language_filtered'
	| 'active'
	| 'inactive'
	| 'reviewed_last_7d'
	| 'not_in_deck'
	| 'language_no_translations'
	| 'language'
// | 'recommended'
// | 'recommended_by_friends' | 'recommended_easiest' | 'recommended_newest' | 'recommended_popular'

function DeckContents({ lang }: LangOnlyComponentProps) {
	const pids = useDeckPidsAndRecs(lang)
	const [filter, setFilter] = useState<FilterEnum>('not_in_deck')
	if (!pids) {
		console.log(
			'Trying to render DeckContents but not getting anything for the recommended pids object'
		)
		return null
	}

	const filteredPids = pids[filter!]
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
						setFilter={setFilter}
						filter={filter}
						text="All phrases"
						count={pids.language_filtered.length}
					/>
					<BadgeFilter
						name="active"
						setFilter={setFilter}
						filter={filter}
						text="Active deck"
						count={pids.active.length}
					/>
					<BadgeFilter
						name="inactive"
						setFilter={setFilter}
						filter={filter}
						text="Inactive"
						count={pids.inactive.length}
					/>
					{/*<BadgeFilter
						name="recommended"
						setFilter={setFilter}
						filter={filter}
						text="Recommended"
						count={pids.recommended.length}
					/>*/}
					<BadgeFilter
						name="not_in_deck"
						setFilter={setFilter}
						filter={filter}
						text="Not in deck"
						count={pids.not_in_deck.length}
					/>
					<BadgeFilter
						name="reviewed_last_7d"
						setFilter={setFilter}
						filter={filter}
						text="Reviewed past week"
						count={pids.reviewed_last_7d.length}
					/>
					<BadgeFilter
						name="language_no_translations"
						setFilter={setFilter}
						filter={filter}
						text="Needs translations"
						count={pids.language_no_translations.length}
					/>
					<BadgeFilter
						name="language"
						setFilter={setFilter}
						filter={filter}
						text="No filters"
						count={pids.language.length}
					/>
				</div>
				{pids.language!.length > 0 ?
					<div className="flex-basis-[20rem] flex shrink flex-row flex-wrap gap-4">
						{filteredPids.length > 0 ?
							<LanguagePhrasesAccordionComponent
								pids={filteredPids}
								lang={lang}
							/>
						:	<Empty clear={() => setFilter('language')} />}
					</div>
				:	<Callout className="mt-4" Icon={() => <Garlic size={120} />}>
						<p>
							This language is fully empty! But Sunlo is a community effort
							&ndash; <em>you</em> have the power to do something about it.
						</p>
						<p>
							You must know <em>at least one phrase</em> in this new language,
							right? Add it to the library!
						</p>
						<Link
							className={buttonVariants({ size: 'lg' })}
							to="/learn/$lang/add-phrase"
							params={{ lang }}
						>
							<MessageSquarePlus size="48" className="h-12 w-12 grow" /> Add a
							phrase to the library
						</Link>
					</Callout>
				}
			</CardContent>
		</Card>
	)
}

function Empty({ clear }: { clear: () => void }) {
	return (
		<Callout variant="ghost" Icon={() => <SearchX />}>
			<p>There are no phrases in the library that match this search.</p>
			<Button variant="outline" onClick={clear}>
				Clear filters
			</Button>
		</Callout>
	)
}

function BadgeFilter({
	setFilter,
	name,
	text,
	filter,
	count = 0,
}: {
	setFilter: (val: FilterEnum) => void
	name: FilterEnum
	text: string
	filter: FilterEnum
	count: number
}) {
	return (
		<Badge variant="outline">
			<label className="flex cursor-pointer gap-1">
				<Checkbox onClick={() => setFilter(name)} checked={filter === name} />{' '}
				{text} ({count})
			</label>
		</Badge>
	)
}
