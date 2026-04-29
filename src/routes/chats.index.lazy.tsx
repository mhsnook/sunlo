import { useState } from 'react'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command'
import { useLanguagesWithPhrases } from '@/features/languages'

const TOP_N = 5

export const Route = createLazyFileRoute('/chats/')({
	component: ChatsIndexPage,
})

function ChatsIndexPage() {
	const { data: languages } = useLanguagesWithPhrases()
	const navigate = useNavigate()
	const [searchOpen, setSearchOpen] = useState(false)

	const ranked = (languages ?? []).slice().toSorted((a, b) => {
		const byPhrases = b.phrases_to_learn - a.phrases_to_learn
		if (byPhrases !== 0) return byPhrases
		return a.name.localeCompare(b.name)
	})

	const top = ranked.slice(0, TOP_N)
	const rest = ranked.slice(TOP_N)
	const showSearchTile = rest.length > 0

	return (
		<div
			data-testid="chats-index-page"
			className="@container mx-auto flex w-full max-w-2xl flex-col gap-6 p-4"
		>
			<header className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold">Chat with the phrasebook</h1>
				<p className="text-muted-foreground text-sm">
					Pick a language. Each conversation has its own cart and selection.
				</p>
			</header>

			<ul
				data-testid="chats-language-list"
				className="grid grid-cols-1 gap-2 @md:grid-cols-2 @lg:grid-cols-3"
			>
				{top.map((language) => (
					<li key={language.lang} data-key={language.lang}>
						<button
							type="button"
							data-testid="chats-language-link"
							onClick={() => {
								void navigate({
									to: '/chats/$lang',
									params: { lang: language.lang },
								})
							}}
							className="bg-card/50 hover:bg-1-mlo-primary block w-full rounded border p-3 text-left text-sm"
						>
							<div className="font-medium">{language.name}</div>
							<div className="text-muted-foreground font-mono text-xs uppercase">
								{language.lang} · {language.phrases_to_learn} phrases
							</div>
						</button>
					</li>
				))}

				{showSearchTile && (
					<li data-key="__search__">
						<button
							type="button"
							data-testid="chats-search-trigger"
							onClick={() => setSearchOpen(true)}
							className="bg-1-lo-primary hover:bg-1-mlo-primary text-foresoft-primary flex w-full flex-col gap-1 rounded border border-dashed p-3 text-left text-sm"
						>
							<div className="flex items-center gap-2 font-medium">
								<Search className="h-4 w-4" />
								More languages…
							</div>
							<div className="text-muted-foreground text-xs">
								{rest.length} more
							</div>
						</button>
					</li>
				)}
			</ul>

			<CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
				<CommandInput
					placeholder="Search languages…"
					data-testid="chats-search-input"
				/>
				<CommandList data-testid="chats-search-results">
					<CommandEmpty>No languages match.</CommandEmpty>
					<CommandGroup>
						{ranked.map((language) => (
							<CommandItem
								key={language.lang}
								value={`${language.name} ${language.lang}`}
								data-testid="chats-search-result"
								data-key={language.lang}
								onSelect={() => {
									setSearchOpen(false)
									void navigate({
										to: '/chats/$lang',
										params: { lang: language.lang },
									})
								}}
							>
								<span>{language.name}</span>
								<span className="text-muted-foreground ml-auto font-mono text-xs uppercase">
									{language.lang}
								</span>
							</CommandItem>
						))}
					</CommandGroup>
				</CommandList>
			</CommandDialog>
		</div>
	)
}
