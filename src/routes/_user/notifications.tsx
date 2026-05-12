import { createFileRoute } from '@tanstack/react-router'
import { notificationsCollection } from '@/features/notifications/collections'
import { publicProfilesCollection } from '@/features/profile/collections'

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
})
