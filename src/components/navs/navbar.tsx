import { ComponentType, useCallback, useState } from 'react'
import { ChevronLeft, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
	Link,
	RouteMatch,
	useMatches,
	useNavigate,
} from '@tanstack/react-router'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { useLinks } from '@/hooks/links'

type NavbarLoaderData = {
	titleBar?: {
		title?: string
		subtitle?: string
		onBackClick?: string | (() => void)
		Icon?: ComponentType<{ size?: number | string; className?: string }>
	}
	contextMenu?: string[]
}
type NavbarMatch = RouteMatch<
	string,
	string,
	unknown,
	unknown,
	unknown,
	unknown,
	unknown
> & {
	loaderData?: NavbarLoaderData
}

export default function Navbar() {
	const matches = useMatches()
	if (matches.some((match) => match.status === 'pending')) return null

	return (
		<nav className="flex items-center justify-between border-b px-[1cqw] py-3">
			<div className="flex h-12 items-center gap-[1cqw]">
				<SidebarTrigger />
				<Title matches={matches} />
			</div>

			<ContextMenu matches={matches} />
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

	const Icon = !titleBar ? null : titleBar.Icon

	return (
		<>
			<Button variant="ghost" size="icon" onClick={onBackClickFn}>
				<ChevronLeft />
				<span className="sr-only">Back</span>
			</Button>
			<Separator orientation="vertical" className="mx-2 h-6" />
			<div className="flex flex-row items-center gap-[1cqw] rounded-2xl">
				{Icon ?
					<Icon size={24} />
				:	null}
				<div>
					<h1 className="text-lg font-bold">{titleBar?.title}</h1>
					<p className="text-sm opacity-80">{titleBar?.subtitle}</p>
				</div>
			</div>
		</>
	)
}

function ContextMenu({ matches }: { matches: NavbarMatch[] }) {
	const [isOpen, setIsOpen] = useState(false)
	const setClosed = useCallback(() => setIsOpen(false), [setIsOpen])
	const match = matches.findLast((m) => !!m?.loaderData?.contextMenu)
	const links = useLinks(match?.loaderData?.contextMenu)
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
				{links.map(({ link, name, Icon }) => (
					<DropdownMenuItem key={link.to}>
						<Link
							{...link}
							className="justify-content-center flex w-full flex-row gap-2"
							onClick={setClosed}
						>
							{!Icon ? null : <Icon className="size-[1.25rem]" />}
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
