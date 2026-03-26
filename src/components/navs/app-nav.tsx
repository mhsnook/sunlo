import { useState } from 'react'
import { Link, useMatches, useRouter } from '@tanstack/react-router'
import { MoreVertical, Search } from 'lucide-react'
import { useIntersectionObserver } from '@uidotdev/usehooks'

import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
} from '@/components/ui/navigation-menu'
import { LinkType } from '@/types/main'
import { useLinks } from '@/hooks/links'
import { TinyBadge } from '@/components/ui/badge'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import type { MyRouterContext } from '@/routes/__root'

const activeProps = {
	className: 'border-primary text-primary-foresoft',
} as const
const activeOptions = { exact: true, includeSearch: false } as const
const inexactOptions = { exact: false, includeSearch: false } as const
const inactiveProps = {
	className:
		'border-transparent text-muted-foreground hover:text-7-mhi-primary',
} as const

export function AppNav() {
	const matches = useMatches()
	const appnavMatch = matches.findLast(
		(m) => (m.context as MyRouterContext)?.appnav
	)
	const appnav = (appnavMatch?.context as MyRouterContext)?.appnav
	const contextMenuMatch = matches.findLast(
		(m) => (m.context as MyRouterContext)?.contextMenu
	)
	const contextMenu = (contextMenuMatch?.context as MyRouterContext)
		?.contextMenu
	const searchActionMatch = matches.findLast(
		(m) => (m.context as MyRouterContext)?.searchAction
	)
	const searchAction = (searchActionMatch?.context as MyRouterContext)
		?.searchAction
	const links = useLinks(appnav)
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
				className={`bg-base-lo-neutral sticky z-30 mt-1 border-b transition-colors ${!entry?.isIntersecting ? 'border-border' : 'border-transparent'} top-0 flex w-full flex-row items-center justify-between gap-2`}
				style={{ viewTransitionName: 'appnav' }}
			>
				<div className="scrollbar-none w-0 grow overflow-x-auto">
					<NavigationMenu className="mt-2 mb-1">
						<NavigationMenuList className="flex w-full flex-row justify-start ps-2">
							{links.map((l: LinkType) => (
								<NavigationMenuItem
									className="hover:bg-1-mlo-primary rounded-xl px-3"
									key={l.link.to}
								>
									<NavigationMenuLink asChild>
										<Link
											{...l.link}
											data-testid={`appnav-${l.name.toLowerCase().replace(/\s+/g, '-')}`}
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
				</div>
				{searchAction && <SearchButton />}
				<ContextMenu contextMenu={contextMenu} />
			</div>
		</>
	)
}

function SearchButton() {
	const router = useRouter()
	return (
		<Button
			variant="ghost"
			size="icon"
			data-testid="appnav-search-button"
			onClick={() => {
				const url = new URL(window.location.href)
				url.searchParams.set('search', 'true')
				void router.navigate({ to: url.pathname + url.search, replace: true })
			}}
		>
			<Search />
			<span className="sr-only">Search</span>
		</Button>
	)
}

function ContextMenu({ contextMenu }: { contextMenu: string[] | undefined }) {
	const [isOpen, setIsOpen] = useState(false)
	const setClosed = () => setIsOpen(false)
	const links = useLinks(contextMenu)

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
							{!Icon ? null : <Icon className="size-5" />}
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
