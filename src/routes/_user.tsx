import { createFileRoute, redirect } from '@tanstack/react-router'
import {
	myProfileCollection,
	myProfileQuery,
} from '@/features/profile/collections'
import { decksCollection } from '@/features/deck/collections'
import { friendSummariesCollection } from '@/features/social/collections'
import { notificationsCollection } from '@/features/notifications/collections'
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

		// Always fetch fresh profile data to avoid race conditions after login
		// This ensures we have the latest data even if the collection is stale
		const fetchProfileData = async () => {
			// Use fetchQuery to always get fresh data, not stale cache
			const profileData = await queryClient.fetchQuery({
				...myProfileQuery,
				// Short stale time to ensure we get fresh data after login
				staleTime: 1000,
			})
			// Sync the collection if query has data but collection doesn't
			if (
				profileData &&
				profileData.length > 0 &&
				myProfileCollection.size === 0
			) {
				await myProfileCollection.utils.refetch()
			}
			return profileData
		}

		// If collection is already loaded with data, just preload other collections
		if (myProfileCollection.size === 1) {
			if (location.pathname !== '/getting-started') {
				void decksCollection.preload()
				void friendSummariesCollection.preload()
				void notificationsCollection.preload()
			}
			return
		}

		// Collection not ready - handle various states
		if (myProfileCollection.status === 'error') {
			console.log(
				`myProfileCollection is in an error state. We'll clean it up and reload it.`
			)
			await myProfileCollection.cleanup()
		}

		// Fetch profile data - this is the source of truth
		const profileData = await fetchProfileData()

		if (location.pathname !== '/getting-started') {
			// Only redirect to getting-started if:
			// 1. Collection is empty AND
			// 2. Fresh query returned no data
			// This avoids false redirects during login race conditions
			if (
				!myProfileCollection.size &&
				(!profileData || profileData.length === 0)
			) {
				console.log(
					`Triggering redirect from /_user to /getting-started because no profile found`
				)
				throw redirect({ to: '/getting-started' })
			} else {
				void decksCollection.preload()
				void friendSummariesCollection.preload()
				void notificationsCollection.preload()
			}
		}
	},
})
