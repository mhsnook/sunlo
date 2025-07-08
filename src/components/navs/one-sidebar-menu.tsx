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
								activeOptions={{ exact: true, includeSearch: false }}
								activeProps={{
									className: 'text-primary-foresoft',
								}}
							>
								{!item.Icon ? null : <item.Icon />}
								<span>{item.title ?? item.name}</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	)
}
