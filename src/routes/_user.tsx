import { createFileRoute, redirect } from '@tanstack/react-router'
import { myProfileQuery } from '@/features/profile/queries'
import { decksQuery } from '@/features/deck/queries'
import { friendSummariesQuery } from '@/features/social/queries'
import { notificationsQuery } from '@/features/notifications/queries'
import { queryClient } from '@/lib/query-client'

export const Route = createFileRoute('/_user')({
	beforeLoad: () => {
		// Auth is optional - RLS handles data security
		// Individual routes can require auth if needed
		return {
			titleBar: {
				title: 'Learning Home',
				subtitle: 'Which deck are we studying today?',
			},
		}
	},
	loader: async ({ context, location }) => {
		// If not authenticated, skip user-specific loading
		if (!context.auth.isAuth) return

		// Block first paint on profile (we need to know if we should redirect
		// to /getting-started). Use ensureQueryData with a short staleTime so
		// we refetch after a fresh login.
		const profileData = await queryClient.ensureQueryData({
			...myProfileQuery,
			staleTime: 1000,
		})

		if (location.pathname !== '/getting-started') {
			if (!profileData || profileData.length === 0) {
				console.log(
					`Triggering redirect from /_user to /getting-started because no profile found`
				)
				throw redirect({ to: '/getting-started' })
			}
			// Fire-and-forget prefetches — populate React Query cache under the
			// same keys the collections use, so when the lazy collection chunks
			// load they hit cache and skip the round-trip.
			void queryClient.prefetchQuery(decksQuery)
			void queryClient.prefetchQuery(friendSummariesQuery)
			void queryClient.prefetchQuery(notificationsQuery)
		}
	},
})
