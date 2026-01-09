import { Link } from '@tanstack/react-router'
import { makeLinks } from '@/hooks/links'
import languages from '@/lib/languages'
import { useProfile } from '@/hooks/use-profile'
import { useDecks } from '@/hooks/use-deck'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/ui/sidebar'
import OneSidebarMenu from '@/components/navs/one-sidebar-menu'
import { useAuth } from '@/lib/use-auth'

// Full deck menu for authenticated users with a deck
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
// Simplified deck menu for public browsing (no deck required)
const publicDeckLinks = [
	'/learn/$lang/feed',
	// '/learn/$lang/playlists',
	'/learn/$lang/search',
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
	'/learn/contributions',
	// '/learn/quick-search',
	'/learn/add-deck',
])
const learnMenuPublic = makeLinks(['/learn', '/learn/add-deck'])
const siteMenu = makeLinks(['/', '/login', '/signup', '/privacy-policy'])
const siteMenuLoggedIn = makeLinks(['/', '/profile', '/privacy-policy'])

export function NavMain({ lang }: { lang?: string }) {
	const { isAuth } = useAuth()
	const { data: profile } = useProfile()
	const { data: decks } = useDecks()
	const isDeckFound = profile && lang && decks?.some((d) => d.lang === lang)
	const { isMobile, open } = useSidebar()

	// Choose appropriate deck menu based on auth and deck status
	const deckMenu =
		isDeckFound ? makeLinks(deckLinks, lang)
		: lang && lang in languages ? makeLinks(publicDeckLinks, lang)
		: null

	return (
		<>
			{deckMenu && lang && lang in languages && (
				<div
					className={
						!open && !isMobile ? 'px-0.5' : 'border-primary/50 border-b px-2'
					}
				>
					{!isDeckFound && isAuth ?
						<DeckNotFound lang={lang} />
					:	<OneSidebarMenu
							menu={deckMenu}
							title=""
							className="bg-primary/10 mb-2 rounded-xl"
						/>
					}
				</div>
			)}
			<OneSidebarMenu
				menu={isAuth ? learnMenu : learnMenuPublic}
				title="Learning center"
			/>
			{isAuth && <OneSidebarMenu menu={friendsMenu} title="Network" />}
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
