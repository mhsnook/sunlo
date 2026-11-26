import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { useDecks } from '@/features/deck'
import { useLanguagesWithPhrases } from '@/features/languages'

export const Route = createLazyFileRoute('/coach/')({
	component: CoachIndexPage,
})

function CoachIndexPage() {
	const { data: decks } = useDecks()
	const { data: languages } = useLanguagesWithPhrases()
	const deckLangs = new Set(
		(decks ?? []).filter((d) => !d.archived).map((d) => d.lang)
	)
	const ranked = (languages ?? []).toSorted(
		(a, b) =>
			Number(deckLangs.has(b.lang)) - Number(deckLangs.has(a.lang)) ||
			b.phrases_to_learn - a.phrases_to_learn
	)

	return (
		<div
			data-testid="coach-index-page"
			className="@container mx-auto flex w-full max-w-2xl flex-col gap-6 p-6"
		>
			<header className="flex flex-col gap-2">
				<h1 className="text-3xl font-bold">
					Which language are we working on?
				</h1>
				<p className="text-muted-foreground">
					Your coach finds phrases for the life you want to live in it, and
					builds your deck with you.
				</p>
			</header>
			<ul
				data-testid="coach-language-list"
				className="grid grid-cols-1 gap-2 @md:grid-cols-2"
			>
				{ranked.map((language) => (
					<li key={language.lang} data-key={language.lang}>
						<Link
							to="/coach/$lang"
							params={{ lang: language.lang }}
							data-testid="coach-language-link"
							className="bg-card hover:border-primary-400 block rounded-2xl border p-4"
						>
							<span className="block font-semibold">{language.name}</span>
							<span className="text-muted-foreground text-sm">
								{deckLangs.has(language.lang) ? 'Your deck · ' : ''}
								{language.phrases_to_learn} phrases in the library
							</span>
						</Link>
					</li>
				))}
			</ul>
		</div>
	)
}
