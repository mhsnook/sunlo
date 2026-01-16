import { useEffectEvent } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { useNavigate, useRouter, useMatches } from '@tanstack/react-router'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useCanGoBack } from '@tanstack/react-router'
import type { MyRouterContext } from '@/routes/__root'

export default function Navbar() {
	return (
		<nav className="flex items-center justify-between gap-4 border-b px-2 py-3">
			<div className="flex h-12 items-center">
				<Title />
			</div>
			<SidebarTrigger />
		</nav>
	)
}

function Title() {
	const navigate = useNavigate()
	const router = useRouter()
	const canGoBack = useCanGoBack()
	const matches = useMatches()

	const titleBarMatch = matches.findLast(
		(m) => (m.context as MyRouterContext)?.titleBar
	)
	const titleBar = (titleBarMatch?.context as MyRouterContext)?.titleBar

	const onBackClick =
		titleBar && 'onBackClick' in titleBar ? titleBar.onBackClick : null

	const goBackOrToStringUrl = useEffectEvent(() => {
		if (onBackClick)
			void navigate({
				to: onBackClick,
			})
		else if (canGoBack)
			document.startViewTransition(() => router.history.back())
		else
			void navigate({
				to: '..',
			})
	})

	return (
		<div className="flex flex-row items-center gap-4">
			<Button
				variant="ghost"
				size="icon"
				onClick={goBackOrToStringUrl}
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
