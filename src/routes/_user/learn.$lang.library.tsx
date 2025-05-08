import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import languages from '@/lib/languages'
import type { LangOnlyComponentProps } from '@/types/main'
import { LanguagePhrasesAccordionComponent } from '@/components/language-phrases-accordion'
import Callout from '@/components/ui/callout'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { useDeckPidsAndRecs } from '@/lib/process-pids'

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
	| 'language'
	| 'active'
	| 'inactive'
	| 'reviewed_last_7d'
	| 'not_in_deck'
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
						name="language"
						setFilter={setFilter}
						filter={filter}
						text="All phrases"
						count={pids.language?.size}
					/>
					<BadgeFilter
						name="active"
						setFilter={setFilter}
						filter={filter}
						text="Active deck"
						count={pids.active?.size}
					/>
					<BadgeFilter
						name="inactive"
						setFilter={setFilter}
						filter={filter}
						text="Inactive"
						count={pids.inactive?.size}
					/>
					{/*<BadgeFilter
						name="recommended"
						setFilter={setFilter}
						filter={filter}
						text="Recommended"
						count={pids.recommended?.length}
					/>*/}
					<BadgeFilter
						name="not_in_deck"
						setFilter={setFilter}
						filter={filter}
						text="Not in deck"
						count={pids.not_in_deck?.size}
					/>
					<BadgeFilter
						name="reviewed_last_7d"
						setFilter={setFilter}
						filter={filter}
						text="Reviewed past week"
						count={pids.reviewed_last_7d?.size}
					/>
				</div>
				{pids.language!.size > 0 ?
					<div className="flex-basis-[20rem] flex shrink flex-row flex-wrap gap-4">
						<LanguagePhrasesAccordionComponent
							pids={Array.from(filteredPids)}
							lang={lang}
						/>
					</div>
				:	<Callout className="mt-4" variant="ghost">
						This language is fully empty! We should have a good pitch here for
						you, user. To say "come check out some starter phrases and
						contribute to the community" or somesuch.
					</Callout>
				}
			</CardContent>
		</Card>
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
