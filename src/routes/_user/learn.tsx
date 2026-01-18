import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PendingRequestsHeader } from './friends/-pending-requests-header'

export const Route = createFileRoute('/_user/learn')({
	component: LearnLayout,
	beforeLoad: ({ context }) => ({
		titleBar: {
			title: 'Learning Home',
			subtitle:
				context.auth?.isAuth ?
					'Which deck are we studying today?'
				:	'Explore community-created language learning content',
		},
		appnav:
			context.auth?.isAuth ?
				['/learn', '/friends', '/learn/contributions', '/learn/add-deck']
			:	['/learn', '/learn/browse'],
		contextMenu: context.auth?.isAuth ? ['/learn/add-deck'] : [],
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
