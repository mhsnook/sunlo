import { createFileRoute, Link, useRouter } from '@tanstack/react-router'

import { NotebookPen, Search } from 'lucide-react'
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
import languages from '@/lib/languages'
import { uuid } from '@/types/main'
import { useLanguagePhrasesMap, useLanguagePids } from '@/hooks/use-language'
import { useCallback, useMemo, type SetStateAction } from 'react'
import { LanguagePhrasesAccordionComponent } from '@/components/language-phrases-accordion'
import { FancyMultiSelect } from '@/components/ui/multi-select'
import { useLanguageTags } from '@/hooks/use-language'
import { Separator } from '@/components/ui/separator'
import { PhraseSearchSchema, PhraseSearchType } from '@/lib/schemas'

export const Route = createFileRoute('/_user/learn/$lang/search')({
	validateSearch: PhraseSearchSchema,
	component: SearchTab,
})

type SearchablePhrase = {
	pid: uuid
	text: string
}

function SearchTab() {
	const { navigate } = useRouter()
	const { lang } = Route.useParams()
	const { text: filter, tags: tagsFilter } = Route.useSearch()

	const { data: phrasesMap } = useLanguagePhrasesMap(lang)
	const { data: pids } = useLanguagePids(lang)

	const { data: allTags = [] } = useLanguageTags(lang)
	const tagOptions = useMemo(
		() => allTags?.map((tag) => ({ value: tag, label: tag })) ?? [],
		[allTags]
	)

	const selectedTags = useMemo(
		() => (tagsFilter ? tagsFilter.split(',').filter(Boolean) : []),
		[tagsFilter]
	)

	const setSelectedTags = useCallback(
		(value: SetStateAction<string[]>) => {
			void navigate({
				to: '.',
				search: (prev: PhraseSearchType) => {
					const newSelectedTags =
						typeof value === 'function' ? value(selectedTags) : value
					return {
						...prev,
						tags:
							newSelectedTags.length ? newSelectedTags.join(',') : undefined,
					}
				},
				replace: true,
				params: true,
			})
		},
		[navigate, selectedTags]
	)

	const searchablePhrases: Array<SearchablePhrase> = useMemo(() => {
		if (!pids || !phrasesMap) return []
		return pids.map((pid: uuid) => {
			const phrase = phrasesMap[pid]
			const tagsText = (phrase.tags ?? [])
				.map((t: { name: string }) => t.name)
				.join(', ')
			return {
				pid,
				text: [
					phrase.text,
					...phrase.translations.map((t) => t.text),
					tagsText,
				].join(', '),
			}
		})
	}, [phrasesMap, pids])

	const searchResults = useMemo(() => {
		const textFilteredPids =
			!filter?.trim() ?
				pids
			:	searchablePhrases
					.filter((searchable) =>
						searchable.text.toUpperCase().includes(filter.toUpperCase())
					)
					.map((s) => s.pid)

		if (!textFilteredPids) return []
		if (!tagsFilter) return textFilteredPids
		if (!phrasesMap) return []

		const selectedTagsFromFilter = tagsFilter.split(',').filter(Boolean)
		if (selectedTagsFromFilter.length === 0) return textFilteredPids

		return textFilteredPids.filter((pid) => {
			const phrase = phrasesMap[pid]
			if (!phrase?.tags) return false
			return selectedTagsFromFilter.every((selectedTag) =>
				phrase
					.tags.filter(Boolean)
					.some((phraseTag) => phraseTag.name === selectedTag)
			)
		})
	}, [filter, searchablePhrases, pids, tagsFilter, phrasesMap])

	return (
		<Card>
			<CardHeader>
				<CardTitle>Search {languages[lang]}</CardTitle>
				<CardDescription>Search for a phrases to learn</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<div>
					<Label htmlFor="phrase">Phrase</Label>
					<Input
						placeholder="Enter a phrase to search or add"
						// oxlint-disable-next-line jsx-no-new-function-as-prop
						onChange={(e) => {
							void navigate({
								to: '.',
								replace: true,
								search: (search: PhraseSearchType) => ({
									...search,
									text: e.target.value,
								}),
							})
						}}
						defaultValue={filter}
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

				{searchResults?.length ?
					<LanguagePhrasesAccordionComponent lang={lang} pids={searchResults} />
				:	<p className="text-muted-foreground mt-4 text-center">
						No results found. Try searching for a phrase or add a new one.
					</p>
				}
			</CardContent>
		</Card>
	)
}
