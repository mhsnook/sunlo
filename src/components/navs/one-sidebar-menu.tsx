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
import { TinyBadge } from '../ui/badge'

const activeOptions = { exact: true, includeSearch: false } as const
const inexactOptions = { exact: false, includeSearch: false } as const
const activeProps = {
	className: 'text-primary-foresoft',
} as const

export default function OneSidebarMenu({
	menu,
	title,
}: {
	menu: Array<LinkType>
	title: string
}) {
	const { setClosedMobile } = useSidebar()

	return (
		<SidebarGroup>
			<SidebarGroupLabel className={!title ? 'sr-only' : ''}>
				{title}
			</SidebarGroupLabel>
			<SidebarMenu>
				{menu.map((item) => (
					<SidebarMenuItem key={item.name}>
						<SidebarMenuButton asChild>
							<Link
								{...item.link}
								onClick={setClosedMobile}
								activeOptions={item.inexact ? inexactOptions : activeOptions}
								activeProps={activeProps}
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
