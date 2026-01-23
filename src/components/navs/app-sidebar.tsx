import type { ComponentProps } from 'react'
import { NavMain } from '@/components/navs/nav-main'
import { NavUser } from '@/components/navs/nav-user'
import { DeckSwitcher } from '@/components/navs/deck-switcher'
import { ActiveReviewCallout } from '@/components/navs/active-review-callout'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from '@/components/ui/sidebar'
import { useParams } from '@tanstack/react-router'
import { ModeToggle } from '@/components/navs/mode-toggle'

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
	const { lang } = useParams({ strict: false })
	return (
		<Sidebar collapsible="icon" variant="floating" {...props}>
			<SidebarHeader>
				<DeckSwitcher lang={lang} />
			</SidebarHeader>
			<SidebarContent>
				<ActiveReviewCallout />
				<NavMain lang={lang} />
			</SidebarContent>
			<SidebarFooter>
				<ModeToggle />
				<NavUser />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	)
}
