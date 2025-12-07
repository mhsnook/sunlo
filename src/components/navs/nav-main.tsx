import { Link } from '@tanstack/react-router'
import { makeLinks } from '@/hooks/links'
import languages from '@/lib/languages'
import { useProfile } from '@/hooks/use-profile'
import { useDecks } from '@/hooks/use-deck'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/ui/sidebar'
import OneSidebarMenu from '@/components/navs/one-sidebar-menu'

const deckLinks = [
	'/learn/$lang/feed',
	'/learn/$lang/review',
	'/learn/$lang/contributions',
	'/learn/$lang/stats',
	'/learn/$lang/add-phrase',
	'/learn/$lang/requests/new',
	'/learn/$lang/search',
	'/learn/$lang/deck-settings',
]
const friendsMenu = makeLinks([
	'/friends',
	'/friends/chats',
	'/friends/requests',
	'/friends/search',
	'/friends/invite',
])
const learnMenu = makeLinks([
	'/learn',
	// '/learn/quick-search',
	'/learn/add-deck',
])
const siteMenu = makeLinks(['/', '/login', '/signup', '/privacy-policy'])
const siteMenuLoggedIn = makeLinks(['/', '/profile', '/privacy-policy'])

export function NavMain({ lang }: { lang?: string }) {
	const { data: profile } = useProfile()
	const { data: decks } = useDecks()
	const deckMenu = makeLinks(deckLinks, lang)
	const isDeckFound = profile && lang && decks.some((d) => d.lang === lang)

	return (
		<>
			{!deckMenu || !lang || !(lang in languages) ? null : (
				<div className="bg-primary/10 mx-2 rounded-2xl pb-2">
					{!isDeckFound ?
						<DeckNotFound lang={lang} />
					:	<OneSidebarMenu menu={deckMenu} title="" />}
				</div>
			)}
			<OneSidebarMenu
				className="border-muted-primary border-t"
				menu={learnMenu}
				title="Learning center"
			/>
			<OneSidebarMenu menu={friendsMenu} title="Network" />
			<OneSidebarMenu
				menu={profile ? siteMenuLoggedIn : siteMenu}
				title="Site"
			/>
		</>
	)
}

function DeckNotFound(props: { lang: string }) {
	const { setClosedMobile } = useSidebar()
	return (
		<div className="p-4 pb-2">
			<p>
				Start work on a new deck of{' '}
				<span className="s-language-name">{languages[props.lang]}</span> flash
				cards?
			</p>
			<Button className="mt-2 w-full" asChild size="sm">
				<Link to="/learn/add-deck" onClick={setClosedMobile} search={props}>
					Start Learning
				</Link>
			</Button>
		</div>
	)
}
