import { createFileRoute } from '@tanstack/react-router'
import { notificationsQuery } from '@/features/notifications/queries'
import { publicProfilesQuery } from '@/features/profile/queries'
import { queryClient } from '@/lib/query-client'

export const Route = createFileRoute('/_user/notifications')({
	beforeLoad: () => ({
		titleBar: {
			title: 'Notifications',
		},
	}),
	loader: async ({ context }) => {
		if (!context.auth.isAuth) return
		await Promise.all([
			queryClient.ensureQueryData(notificationsQuery),
			queryClient.ensureQueryData(publicProfilesQuery),
		])
	},
})
