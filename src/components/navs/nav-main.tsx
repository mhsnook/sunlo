import { makeLinks } from '@/hooks/links'
import OneSidebarMenu from '@/components/navs/one-sidebar-menu'
import Callout from '@/components/ui/callout'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'
import languages from '@/lib/languages'
import { useProfile } from '@/lib/use-profile'
import { LangOnlyComponentProps } from '@/types/main'

const deckLinks = [
	'/learn/$lang',
	'/learn/$lang/review',
	'/learn/$lang/search',
	'/learn/$lang/library',
	'/learn/$lang/add-phrase',
	'/learn/$lang/deck-settings',
]
const friendsMenu = makeLinks([
	'/friends',
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
	const deckMenu = !lang ? null : makeLinks(deckLinks, lang)
	const languageName = lang ? languages[lang] : null
	const isDeckFound = profile && profile.deckLanguages.indexOf(lang) > -1

	return (
		<>
			{!deckMenu || !lang ? null : (
				<div className="bg-muted-foreground/10 pb-2">
					{!languageName ?
						<LanguageNotFound />
					: !isDeckFound ?
						<DeckNotFound lang={lang} />
					:	<OneSidebarMenu menu={deckMenu} title="" />}
				</div>
			)}
			<OneSidebarMenu menu={learnMenu} title="Learning center" />
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
	return (
		<Callout className="m-2">
			<p>
				It seems like you're not studying {languages[lang]} (yet). Would you
				like to start working on a new deck?
			</p>
			<Button className="mt-2 w-full" asChild>
				<Link to="/learn/add-deck" search={{ lang }}>
					Start Learning
				</Link>
			</Button>
		</Callout>
	)
}
