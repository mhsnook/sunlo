import { PendingRequestsHeader } from '@/components/friends/pending-requests-header'
import { TitleBar } from '@/types/main'
import { createFileRoute, Outlet } from '@tanstack/react-router'

import { Home } from 'lucide-react'

export const Route = createFileRoute('/_user/learn')({
	component: LearnLayout,
	loader: () => {
		return {
			appnav: ['/learn', '/friends', '/learn/add-deck'],
			contextMenu: ['/learn/add-deck' /*'/learn/quick-search'*/],
			titleBar: {
				title: `Learning Home`,
				subtitle: `Which deck are we studying today?`,
				Icon: Home,
			} as TitleBar,
		}
	},
})

function LearnLayout() {
	return (
		<div className="space-y-4">
			<PendingRequestsHeader shy />
			<Outlet />
		</div>
	)
}
