import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/learn')({
	component: Outlet,
	staticData: {
		search: 'content',
		contextMenu: [['/learn/add-deck', '/learn/contributions']],
		titleBar: ({ isAuth }) => ({
			title: 'Learning Home',
			subtitle: isAuth
				? 'Which deck are we studying today?'
				: 'Explore community-created language learning content',
		}),
	},
})
