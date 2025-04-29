import { Link, useMatches } from '@tanstack/react-router'
import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
} from './ui/navigation-menu'
import { LinkType } from '@/types/main'
import { useLinks } from '@/hooks/links'
import { ScrollArea, ScrollBar } from './ui/scroll-area'
import { useIntersectionObserver } from '@uidotdev/usehooks'

export function AppNav() {
	const matches = useMatches()
	if (matches.some((match) => match.status === 'pending')) return null
	return <Nav matches={matches} />
}

function Nav({ matches }: { matches: ReturnType<typeof useMatches> }) {
	const match = matches.findLast((m) => !!m?.loaderData?.appnav)
	const links = useLinks(match?.loaderData?.appnav)
	const [ref, entry] = useIntersectionObserver({
		threshold: 0,
		root: null,
		rootMargin: '100px',
	})
	if (!links || !links.length) return null
	return (
		<>
			<div ref={ref}></div>
			<div
				className={`bg-background sticky border-b transition-colors ${!entry?.isIntersecting ? 'border-border' : 'border-transparent'} top-0 mb-4`}
			>
				<ScrollArea>
					<NavigationMenu className="my-2">
						<NavigationMenuList className="flex w-full flex-row">
							{links.map((l: LinkType) => (
								<NavigationMenuItem
									className="hover:bg-primary/20 rounded px-4"
									key={l.link.to}
								>
									<NavigationMenuLink asChild>
										<Link
											{...l.link}
											className="flex flex-row items-center justify-center gap-2 border-b-2 py-2"
											activeProps={{
												className: 'border-primary text-foreground',
											}}
											activeOptions={{ exact: true, includeSearch: false }}
											inactiveProps={{
												className: 'border-transparent text-muted-foreground',
											}}
										>
											{!l.Icon ? null : <l.Icon className="size-4" />}{' '}
											<>{l.name}</>
										</Link>
									</NavigationMenuLink>
								</NavigationMenuItem>
							))}
						</NavigationMenuList>
					</NavigationMenu>
					<ScrollBar orientation="horizontal" />
				</ScrollArea>
			</div>
		</>
	)
}
