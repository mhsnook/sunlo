import { Link, useMatches } from '@tanstack/react-router'
import type { MyRouterContext } from '@/routes/__root'
import { useLinks } from '@/hooks/links'
import { cn } from '@/lib/utils'

export function RightSidebar() {
	const matches = useMatches()
	const contextMenuMatch = matches.findLast(
		(m) => (m.context as MyRouterContext)?.contextMenu
	)
	const contextMenu = (contextMenuMatch?.context as MyRouterContext)
		?.contextMenu
	const links = useLinks(contextMenu)

	return (
		<aside className="sticky top-4 hidden w-(--sidebar-width) shrink-0 self-start ps-8 pt-4 @3xl:block">
			{links?.length ?
				<div className="space-y-1">
					<p className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
						Quick Actions
					</p>
					{links.map(({ link, title, Icon }) => (
						<Link
							key={link.to}
							{...link}
							className={cn(
								'flex w-full flex-row items-center gap-3 rounded-lg px-3 py-2 text-sm',
								'text-sidebar-foreground transition-colors',
								'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
							)}
							activeProps={{
								className:
									'bg-sidebar-accent/50 text-sidebar-accent-foreground font-medium',
							}}
						>
							{Icon && <Icon className="size-4 shrink-0" />}
							<span className="truncate">{title}</span>
						</Link>
					))}
				</div>
			:	null}
		</aside>
	)
}
