import type { ComponentProps } from 'react'
import { NavMain } from '@/components/navs/nav-main'
import { NavUser } from '@/components/navs/nav-user'
import { NavFooterActions } from '@/components/navs/nav-footer-actions'
import { DeckSwitcher } from '@/components/navs/deck-switcher'
import { ActiveReviewCallout } from '@/components/navs/active-review-callout'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
	SidebarSeparator,
} from '@/components/ui/sidebar'
import { useParams } from '@tanstack/react-router'

export function AppSidebar({
	focusMode,
	...props
}: ComponentProps<typeof Sidebar> & { focusMode?: boolean }) {
	const { lang } = useParams({ strict: false })
	return (
		<Sidebar
			collapsible={focusMode ? 'offcanvas' : 'icon'}
			variant="floating"
			{...props}
		>
			<SidebarHeader>
				<DeckSwitcher lang={lang} />
			</SidebarHeader>
			<SidebarContent>
				<ActiveReviewCallout currentLang={lang} />
				<NavMain />
				<SidebarSeparator />
				<NavUser />
			</SidebarContent>
			<SidebarFooter>
				<NavFooterActions />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	)
}
