import { useEffectEvent } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { useMatches, useNavigate, useRouter } from '@tanstack/react-router'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { NavbarMatch } from './types'
import { useCanGoBack } from '@tanstack/react-router'

export default function Navbar() {
	const matches = useMatches()
	if (matches.some((match) => match.status === 'pending')) return null

	return (
		<nav className="flex items-center justify-between gap-4 border-b px-2 py-3">
			<div className="flex h-12 items-center">
				<Title matches={matches} />
			</div>
			<SidebarTrigger />
		</nav>
	)
}

function Title({ matches }: { matches: NavbarMatch[] }) {
	const navigate = useNavigate()
	const router = useRouter()
	const canGoBack = useCanGoBack()

	const match = matches.findLast((m) => !!m?.loaderData?.titleBar)
	const titleBar = match?.loaderData?.titleBar

	const goBackOrToStringUrl = useEffectEvent(() => {
		if (canGoBack && (titleBar?.onBackClick === '<' || !titleBar?.onBackClick))
			document.startViewTransition(() => router.history.back())
		else if (typeof titleBar?.onBackClick === 'function')
			titleBar?.onBackClick()
		else if (typeof titleBar?.onBackClick === 'string')
			void navigate({
				to: titleBar?.onBackClick,
			})
		else
			void navigate({
				to: '..',
			})
	})

	return (
		<div className="flex flex-row items-center gap-4">
			<Button variant="ghost" size="icon" onClick={goBackOrToStringUrl}>
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
