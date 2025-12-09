import { useCallback } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { useMatches, useNavigate } from '@tanstack/react-router'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { NavbarMatch } from './types'

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

	const match = matches.findLast((m) => !!m?.loaderData?.titleBar)
	const titleBar = match?.loaderData?.titleBar

	const goBackOrToStringUrl = useCallback(() => {
		void navigate({
			to:
				typeof titleBar?.onBackClick === 'string' ?
					titleBar?.onBackClick
				:	'..',
		})
	}, [navigate, titleBar?.onBackClick])

	if (!titleBar) return null
	const onBackClickFn =
		typeof titleBar.onBackClick === 'function' ?
			titleBar.onBackClick
		:	goBackOrToStringUrl

	return (
		<div className="flex flex-row items-center gap-4">
			<Button variant="ghost" size="icon" onClick={onBackClickFn}>
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
