import { makeLinks } from '@/hooks/links'
import OneSidebarMenu from '@/components/navs/one-sidebar-menu'
import Callout from '@/components/ui/callout'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'
import languages from '@/lib/languages'
import { useProfile } from '@/lib/use-profile'
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
			{!deckMenu || !lang ? null : (
				<div className="bg-primary/10 mx-2 rounded-2xl pb-2">
					{!(lang in languages) ?
						<LanguageNotFound />
					: !isDeckFound ?
						<DeckNotFound lang={lang} />
					:	<OneSidebarMenu menu={deckMenu} title="" />}
				</div>
			)}
			<OneSidebarMenu
				className="border-muted-primary border-t"
				menu={learnMenu}
				title="Learning center"
			/>
			<OneSidebarMenu menu={friendsMenu} title="Friends & contacts" />
			<OneSidebarMenu menu={siteMenu} title="Site" />
		</>
	)
}

function LanguageNotFound() {
	return (
		<Callout className="m-2">
			<p>
				This language doesn't seem to exist. Please check your URL and try
				again.
			</p>
		</Callout>
	)
}

function DeckNotFound({ lang }: LangOnlyComponentProps) {
	const { setClosedMobile } = useSidebar()
	return (
		<Callout className="m-2">
			<p>
				It seems like you're not studying {languages[lang]} (yet). Would you
				like to start working on a new deck?
			</p>
			<Button className="mt-2 w-full" asChild>
				<Link to="/learn/add-deck" onClick={setClosedMobile} search={{ lang }}>
					Start Learning
				</Link>
			</Button>
		</Callout>
	)
}
