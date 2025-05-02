import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import languages from '@/lib/languages'
import type { LangOnlyComponentProps } from '@/types/main'
import { useDeck } from '@/lib/use-deck'
import { useLanguage } from '@/lib/use-language'
import { LanguagePhrasesAccordionComponent } from '@/components/language-phrases-accordion'
import Callout from '@/components/ui/callout'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { ProcessedPids, processPids } from '@/lib/process-pids'

export const Route = createFileRoute('/_user/learn/$lang/library')({
	component: DeckLibraryPage,
})

function DeckLibraryPage() {
	const { lang } = Route.useParams()
	const { data: deck } = useDeck(lang)
	const { data: language } = useLanguage(lang)
	if (!language) throw new Error("Could not load this language's data")
	if (!deck) throw new Error("Could not load this deck's data")

	const processedPids = useMemo(
		() => processPids(language.phrasesMap, language.pids, deck.pids),
		[language.pids, deck.pids, language.phrasesMap]
	)
	return (
		<div className="space-y-4 px-2">
			<DeckContents lang={lang} pids={processedPids} />
		</div>
	)
}

type FilterEnum = 'language' | 'deck' | 'reviewed_last_7d' | 'not_in_deck'
// | 'recommended'

function DeckContents({
	lang,
	pids,
}: LangOnlyComponentProps & { pids: ProcessedPids }) {
	const [filter, setFilter] = useState<FilterEnum>('not_in_deck')

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
						count={pids.language?.length}
					/>
					<BadgeFilter
						name="deck"
						setFilter={setFilter}
						filter={filter}
						text="In your deck"
						count={pids.deck?.length}
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
						count={pids.not_in_deck?.length}
					/>
					<BadgeFilter
						name="reviewed_last_7d"
						setFilter={setFilter}
						filter={filter}
						text="Reviewed past week"
						count={pids.reviewed_last_7d?.length}
					/>
				</div>
				{pids.language!.length > 0 ?
					<div className="flex-basis-[20rem] flex shrink flex-row flex-wrap gap-4">
						<LanguagePhrasesAccordionComponent
							pids={filteredPids}
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
