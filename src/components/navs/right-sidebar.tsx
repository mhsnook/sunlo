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

	if (!links || !links.length) return null

	return (
		<aside className="hidden w-56 shrink-0 @3xl:block">
			<div className="sticky top-4 space-y-1 rounded-lg border bg-card/50 p-3">
				<p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
					Quick Actions
				</p>
				{links.map(({ link, title, Icon }) => (
					<Link
						key={link.to}
						{...link}
						className={cn(
							'flex w-full flex-row items-center gap-3 rounded-lg px-3 py-2 text-sm',
							'text-muted-foreground transition-colors',
							'hover:bg-accent hover:text-accent-foreground'
						)}
						activeProps={{
							className: 'bg-accent/50 text-accent-foreground font-medium',
						}}
					>
						{Icon && <Icon className="size-4 shrink-0" />}
						<span className="truncate">{title}</span>
					</Link>
				))}
			</div>
		</aside>
	)
}
