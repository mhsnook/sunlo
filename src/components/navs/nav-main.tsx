import { makeLinks } from '@/hooks/links'
import OneSidebarMenu from '@/components/navs/one-sidebar-menu'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'
import languages from '@/lib/languages'
import { useProfile } from '@/hooks/use-profile'
import { LangOnlyComponentProps } from '@/types/main'
import { useSidebar } from '../ui/sidebar'

const deckLinks = [
	'/learn/$lang',
	'/learn/$lang/review',
	'/learn/$lang/search',
	'/learn/$lang/requests',
	'/learn/$lang/library',
	'/learn/$lang/add-phrase',
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

export function NavMain({ lang }: { lang?: string }) {
	const { data: profile } = useProfile()
	const deckMenu = makeLinks(deckLinks, lang)
	const isDeckFound = profile && lang && profile.deckLanguages.includes(lang)

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
			<OneSidebarMenu menu={siteMenu} title="Site" />
		</>
	)
}

function DeckNotFound(props: LangOnlyComponentProps) {
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
