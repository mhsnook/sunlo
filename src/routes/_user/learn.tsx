import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PendingRequestsHeader } from './friends/-pending-requests-header'

export const Route = createFileRoute('/_user/learn')({
	component: LearnLayout,
	beforeLoad: () => ({
		titleBar: {
			title: 'Learning Home',
			subtitle: 'Which deck are we studying today?',
		},
		appnav: ['/learn', '/friends', '/learn/contributions', '/learn/add-deck'],
		contextMenu: ['/learn/add-deck' /*'/learn/quick-search'*/],
	}),
})

function LearnLayout() {
	return (
		<div className="space-y-4">
			<PendingRequestsHeader shy />
			<Outlet />
		</div>
	)
}
