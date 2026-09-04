import { ChevronLeft, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { useRouter, useMatches } from '@tanstack/react-router'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { useTitleBar } from '@/hooks/use-title-bar'
import { useGoBack } from '@/hooks/use-go-back'

export default function Navbar() {
	const matches = useMatches()
	const focusMode = matches.some((m) => m.staticData.focusMode)
	const hasSearchAction = matches.some((m) => !!m.staticData.search)

	return (
		<nav
			className="flex items-center justify-between gap-4 border-b px-2 py-3"
			style={{ viewTransitionName: 'navbar' }}
		>
			<div className="flex h-12 items-center">
				<Title />
			</div>
			<div className="flex items-center gap-2">
				{!focusMode && hasSearchAction && <NavSearchButton />}
				{!focusMode && <NotificationBell />}
				<SidebarTrigger />
			</div>
		</nav>
	)
}

function Title() {
	const titleBar = useTitleBar()
	const { goBack } = useGoBack()

	return (
		<div className="flex flex-row items-center gap-4">
			<Button
				variant="ghost"
				size="icon"
				onClick={goBack}
				data-testid="navbar-back"
			>
				<ChevronLeft />
				<span className="sr-only">Back</span>
			</Button>

			<div className="flex flex-row items-center gap-[1cqw] rounded-2xl">
				<div>
					<h1 className="text-lg font-bold">{titleBar?.title}</h1>
					<p className="text-sm opacity-80">{titleBar?.subtitle}</p>
				</div>
			</div>
		</div>
	)
}

function NavSearchButton() {
	const router = useRouter()
	return (
		<Button
			variant="ghost"
			size="icon"
			data-testid="navbar-search-button"
			onClick={() => {
				const url = new URL(window.location.href)
				url.searchParams.set('search', 'true')
				void router.navigate({ to: url.pathname + url.search, replace: true })
			}}
		>
			<Search className="h-5 w-5" />
			<span className="sr-only">Search</span>
		</Button>
	)
}
