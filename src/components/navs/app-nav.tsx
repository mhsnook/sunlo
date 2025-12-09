import { memo, useCallback, useState } from 'react'
import { Link, useMatches } from '@tanstack/react-router'
import { MoreVertical } from 'lucide-react'
import { useIntersectionObserver } from '@uidotdev/usehooks'

import type { NavbarMatch } from './types'
import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
} from '@/components/ui/navigation-menu'
import { LinkType } from '@/types/main'
import { useLinks } from '@/hooks/links'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { TinyBadge } from '@/components/ui/badge'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export function AppNav() {
	const matches: NavbarMatch[] = useMatches()
	if (matches.some((match) => match.status === 'pending')) return null
	return <Nav matches={matches} />
}

const activeProps = {
	className: 'border-primary text-primary-foresoft',
} as const
const activeOptions = { exact: true, includeSearch: false } as const
const inexactOptions = { exact: false, includeSearch: false } as const
const inactiveProps = {
	className: 'border-transparent text-muted-foreground',
} as const

const Nav = memo(function Nav({ matches }: { matches: NavbarMatch[] }) {
	const match = matches.findLast((m) => !!m.loaderData?.appnav)
	const links = useLinks(match?.loaderData?.appnav)
	const [ref, entry] = useIntersectionObserver({
		threshold: 0,
		root: null,
		rootMargin: '12px',
	})
	if (!links || !links.length) return null
	return (
		<>
			<div ref={ref}></div>

			<div
				className={`bg-background sticky z-30 mt-1 border-b transition-colors ${!entry?.isIntersecting ? 'border-border' : 'border-transparent'} top-0 flex w-full flex-row items-center justify-between gap-2 ps-2`}
			>
				<ScrollArea className="w-app">
					<NavigationMenu className="mt-2 mb-1">
						<NavigationMenuList className="flex w-full flex-row">
							{links.map((l: LinkType) => (
								<NavigationMenuItem
									className="hover:bg-primary/20 rounded-xl px-3"
									key={l.link.to}
								>
									<NavigationMenuLink asChild>
										<Link
											{...l.link}
											className="flex flex-row items-center justify-center gap-2 border-b-2 py-1.5 text-sm whitespace-nowrap"
											activeProps={activeProps}
											activeOptions={l.inexact ? inexactOptions : activeOptions}
											inactiveProps={inactiveProps}
										>
											{!l.Icon ? null : <l.Icon className="size-4 shrink-0" />}{' '}
											<>{l.name}</>
											{!l.useBadge ? null : <TinyBadge useBadge={l.useBadge} />}
										</Link>
									</NavigationMenuLink>
								</NavigationMenuItem>
							))}
						</NavigationMenuList>
					</NavigationMenu>
					<ScrollBar orientation="horizontal" />
				</ScrollArea>
				<ContextMenu matches={matches} />
			</div>
		</>
	)
})

function ContextMenu({ matches }: { matches: NavbarMatch[] }) {
	const [isOpen, setIsOpen] = useState(false)
	const setClosed = useCallback(() => setIsOpen(false), [setIsOpen])
	const match = matches.findLast((m) => !!m?.loaderData?.contextMenu)
	const links = useLinks(match?.loaderData?.contextMenu)
	if (!links || !links.length) return null

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger id="top-right-context-menu" asChild>
				<Button className="me-2" variant="ghost" size="icon">
					<MoreVertical />
					<span className="sr-only">Open menu</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				{links.map(({ link, title, Icon }) => (
					<DropdownMenuItem key={link.to}>
						<Link
							{...link}
							className="flex w-full flex-row items-center gap-2"
							onClick={setClosed}
						>
							{!Icon ? null : <Icon className="size-[1.25rem]" />}
							{title}
						</Link>
					</DropdownMenuItem>
				)) || (
					<DropdownMenuItem disabled>No options available</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
