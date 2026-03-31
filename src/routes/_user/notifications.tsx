import { createFileRoute } from '@tanstack/react-router'
import { notificationsCollection } from '@/features/notifications/collections'
import { publicProfilesCollection } from '@/features/profile/collections'
import { RequireAuth } from '@/components/require-auth'
import { NotificationList } from '@/components/notifications/notification-list'

export const Route = createFileRoute('/_user/notifications')({
	beforeLoad: () => ({
		titleBar: {
			title: 'Notifications',
		},
	}),
	loader: async ({ context }) => {
		if (!context.auth.isAuth) return
		await Promise.all([
			notificationsCollection.preload(),
			publicProfilesCollection.preload(),
		])
	},
	component: NotificationsPage,
})

function NotificationsPage() {
	return (
		<RequireAuth message="Log in to see your notifications.">
			<NotificationList />
		</RequireAuth>
	)
}
