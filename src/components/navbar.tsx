import { useCallback, useState } from 'react'
import { ChevronLeft, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Link, useMatches, useNavigate } from '@tanstack/react-router'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { useLinks } from '@/hooks/links'

export default function Navbar() {
	const matches = useMatches()
	if (matches.some((match) => match.status === 'pending')) return null

	return (
		<nav className="flex items-center justify-between py-3 px-[1cqw] mb-4 border-b">
			<div className="flex items-center gap-[1cqw] h-12">
				<SidebarTrigger />
				<Title matches={matches} />
			</div>

			<ContextMenu matches={matches} />
		</nav>
	)
}

function Title({
	matches,
}: {
	matches: Array<{ loaderData?: { titleBar?: any } }>
}) {
	const navigate = useNavigate()
	const goBack = useCallback(() => {
		void navigate({ to: '..' })
	}, [navigate])

	const match = matches.findLast((m) => !!m?.loaderData?.titleBar)
	const data = match?.loaderData.titleBar
	if (!data) return null
	const Icon = !data ? null : data.Icon
	const onBackClick = data?.onBackClick ?? goBack
	return (
		<>
			<Button variant="ghost" size="icon-sm" onClick={onBackClick}>
				<ChevronLeft />
				<span className="sr-only">Back</span>
			</Button>
			<Separator orientation="vertical" className="mx-2 h-6" />
			<div className="flex flex-row items-center gap-[1cqw]">
				{Icon ?
					<span className="rounded">
						<Icon size="24" />
					</span>
				:	<>&nbsp;</>}
				<div>
					<h1 className="text-lg font-bold">{data?.title}</h1>
					<p className="text-sm">{data?.subtitle}</p>
				</div>
			</div>
		</>
	)
}

function ContextMenu({ matches }) {
	const [isOpen, setIsOpen] = useState(false)
	const match = matches.findLast((m) => !!m?.loaderData?.contextMenu)
	const links = useLinks(match?.loaderData.contextMenu)
	if (!links || !links.length) return null

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon">
					<MoreVertical />
					<span className="sr-only">Open menu</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				{links.map(({ link, name, Icon }, index) => (
					<DropdownMenuItem key={index}>
						<Link
							{...link}
							className="w-full flex flex-row gap-2 justify-content-center"
						>
							<Icon className="size-[1.25rem]" />
							{name}
						</Link>
					</DropdownMenuItem>
				)) || (
					<DropdownMenuItem disabled>No options available</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
