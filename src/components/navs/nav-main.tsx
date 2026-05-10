import { makeLinks } from '@/hooks/links'
import OneSidebarMenu from '@/components/navs/one-sidebar-menu'
import { useAuth } from '@/lib/use-auth'

const mainMenu = makeLinks([
	'/learn',
	'/search',
	'/browse',
	'/notifications',
	'/friends',
	'/friends/chats',
])
const mainMenuPublic = makeLinks(['/learn', '/search', '/browse'])

export function NavMain() {
	const { isAuth } = useAuth()
	return <OneSidebarMenu menu={isAuth ? mainMenu : mainMenuPublic} title="" />
}
