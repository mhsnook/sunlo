import { Link, useMatches } from '@tanstack/react-router'
import { useLinks } from '@/hooks/links'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/use-auth'
import { resolveNavList } from '@/types/route-static-data'

export function RightSidebar() {
	const { isAuth } = useAuth()
	const matches = useMatches()
	const contextMenu = resolveNavList(
		matches.findLast((m) => m.staticData.contextMenu)?.staticData.contextMenu,
		isAuth
	)
	const links = useLinks(contextMenu)
	const fixedHeight = matches.some((m) => m.staticData.fixedHeight)

	// In fixedHeight mode (chats, review), hide when empty to reclaim space.
	// In default mode, render the empty placeholder for visual consistency.
	if (!links?.length && fixedHeight) return null

	return (
		<aside className="sticky top-4 hidden w-(--sidebar-width) shrink-0 self-start ps-8 pt-4 @3xl:block">
			{!links?.length ? null : (
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
			)}
		</aside>
	)
}
