import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from '@/components/ui/sidebar'
import { Link } from '@tanstack/react-router'
import { LinkType } from '@/types/main'
import { TinyBadge } from '@/components/ui/badge'

const activeOptions = { exact: true, includeSearch: false } as const
const inexactOptions = { exact: false, includeSearch: false } as const
const activeProps = {
	className: 'text-primary-foresoft',
} as const

export default function OneSidebarMenu({
	menu,
	title,
	className,
}: {
	menu: Array<LinkType>
	title: string
	className?: string
}) {
	const { setClosedMobile } = useSidebar()

	return (
		<SidebarGroup className={className}>
			<SidebarGroupLabel className={!title ? 'sr-only' : ''}>
				{title}
			</SidebarGroupLabel>
			<SidebarMenu>
				{menu.map((item) => (
					<SidebarMenuItem key={item.name}>
						<SidebarMenuButton asChild>
							<Link
								{...item.link}
								data-testid={`sidebar-link-${item.link.to.replace(/\$/g, '').replace(/\//g, '-')}`}
								onClick={setClosedMobile}
								activeOptions={item.inexact ? inexactOptions : activeOptions}
								activeProps={activeProps}
								className="flex flex-row"
							>
								{!item.Icon ? null : <item.Icon />}
								<span>{item.title ?? item.name}</span>
								{item.useBadge ?
									<TinyBadge useBadge={item.useBadge} />
								:	null}
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	)
}
