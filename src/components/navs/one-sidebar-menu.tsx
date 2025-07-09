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

const activeOptions = { exact: true, includeSearch: false } as const
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
								activeOptions={activeOptions}
								activeProps={activeProps}
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
