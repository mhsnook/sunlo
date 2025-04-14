import { TitleBar } from '@/types/main'
import { createFileRoute, Outlet } from '@tanstack/react-router'

import { Home } from 'lucide-react'

export const Route = createFileRoute('/_user/learn')({
	component: LearnLayout,
	loader: () => {
		return {
			appnav: ['/learn', '/learn/add-deck', '/learn/quick-search'],
			contextMenu: ['/learn/add-deck', '/learn/quick-search'],
			titleBar: {
				title: `Learning Home`,
				subtitle: `Which deck are we studying today?`,
				Icon: Home,
			} as TitleBar,
		}
	},
})

function LearnLayout() {
	return <Outlet />
}
