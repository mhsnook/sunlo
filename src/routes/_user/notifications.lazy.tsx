import { createLazyFileRoute } from '@tanstack/react-router'
import { RequireAuth } from '@/components/require-auth'
import { NotificationList } from '@/components/notifications/notification-list'

export const Route = createLazyFileRoute('/_user/notifications')({
	component: NotificationsPage,
})

function NotificationsPage() {
	return (
		<RequireAuth message="Log in to see your notifications.">
			<div data-testid="notifications-page">
				<NotificationList />
			</div>
		</RequireAuth>
	)
}
