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
import { useLanguagePhrasesMap, useLanguagePids } from '@/lib/use-language'
import { useMemo } from 'react'
import { LanguagePhrasesAccordionComponent } from '@/components/language-phrases-accordion'

interface SearchParams {
	text?: string
}

export const Route = createFileRoute('/_user/learn/$lang/search')({
	validateSearch: (search: Record<string, unknown>): SearchParams => {
		return {
			text: (search.text as string) || '',
		}
	},
	component: SearchTab,
})

type SearchablePhrase = {
	pid: uuid
	text: string
}

function SearchTab() {
	const { navigate } = useRouter()
	const { lang } = Route.useParams()
	const { text: filter } = Route.useSearch()

	const { data: phrasesMap } = useLanguagePhrasesMap(lang)
	const { data: pids } = useLanguagePids(lang)

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
		if (!filter?.trim()) return pids
		return searchablePhrases
			.filter((searchable: SearchablePhrase) => {
				return searchable.text.toUpperCase().includes(filter.toUpperCase())
			})
			.map((s) => s.pid)
	}, [filter, searchablePhrases, pids])

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
						onChange={(e) => {
							void navigate({
								to: '.',
								replace: true,
								search: (search: SearchParams) => ({
									...search,
									text: e.target.value,
								}),
							})
						}}
						defaultValue={filter}
					/>
				</div>
				<div className="flex flex-row gap-2">
					<Button type="submit">
						<Search /> Search Phrase
					</Button>
					<Button variant="link" asChild>
						<Link
							to="/learn/$lang/add-phrase"
							from={Route.fullPath}
							search={(search: SearchParams) => ({ ...search, text: filter })}
						>
							<NotebookPen />
							Add New Phrase
						</Link>
					</Button>
				</div>

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
