import { useEffect, useState, type SetStateAction } from 'react'
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
import { FancyMultiSelect } from '@/components/ui/multi-select'
import languages from '@/lib/languages'
import { useLanguageTags } from '@/hooks/use-language'
import { Separator } from '@/components/ui/separator'
import { PhraseSearchSchema, PhraseSearchType } from '@/lib/schemas'
import { DisplayPhrasesQuery } from '@/components/display-phrase-query'

export const Route = createFileRoute('/_user/learn/$lang/search')({
	validateSearch: PhraseSearchSchema,
	component: SearchTab,
})

function SearchTab() {
	const navigate = useNavigate({ from: Route.fullPath })
	const { lang } = Route.useParams()
	const { text: searchText, tags: tagsFilter } = Route.useSearch()
	const [liveText, setLiveText] = useState(searchText)
	const debouncedText = useDebounce(liveText, 100)

	useEffect(() => {
		if (debouncedText !== searchText) {
			void navigate({ search: (prev) => ({ ...prev, text: debouncedText }) })
		}
	}, [debouncedText, searchText, navigate])

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
				<DisplayPhrasesQuery lang={lang} text={liveText} tags={selectedTags} />
			</CardContent>
		</Card>
	)
}
