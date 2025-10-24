import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	type SetStateAction,
} from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useDebounce } from '@uidotdev/usehooks'

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
import { useLanguagePhrasesSearch, useLanguageTags } from '@/hooks/use-language'
import { LanguagePhrasesAccordionComponent } from '@/components/language-phrases-accordion'
import { FancyMultiSelect } from '@/components/ui/multi-select'
import { Separator } from '@/components/ui/separator'
import { PhraseSearchSchema, PhraseSearchType } from '@/lib/schemas'

export const Route = createFileRoute('/_user/learn/$lang/search')({
	validateSearch: PhraseSearchSchema,
	component: SearchTab,
})

function SearchTab() {
	const navigate = useNavigate({ from: Route.fullPath })
	const { lang } = Route.useParams()
	const { text: filter, tags: tagsFilter } = Route.useSearch()
	const [text, setText] = useState(filter)
	const debouncedText = useDebounce(text, 100)

	useEffect(() => {
		if (debouncedText !== filter) {
			void navigate({ search: (prev) => ({ ...prev, text: debouncedText }) })
		}
	}, [debouncedText, filter, navigate])

	const { data: langTags } = useLanguageTags(lang)
	const tagOptions = useMemo(
		() =>
			(langTags ?? []).map((tag) => ({ value: tag.name, label: tag.name })) ??
			[],
		[langTags]
	)

	const selectedTags = useMemo(
		() => (tagsFilter ? tagsFilter.split(',').filter(Boolean) : []),
		[tagsFilter]
	)

	const setSelectedTags = useCallback(
		(value: SetStateAction<string[]>) => {
			void navigate({
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

	const { data: searchResults } = useLanguagePhrasesSearch(
		lang,
		debouncedText ?? '',
		selectedTags
	)

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
						onChange={(e) => setText(e.target.value)}
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
