import { useEffect, type ComponentType } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
	createFileRoute,
	Outlet,
	type RouteMatch,
	redirect,
	useMatches,
} from '@tanstack/react-router'
// Note: redirect is still used in the loader for getting-started check

import type { Tables } from '@/types/supabase'
import supabase from '@/lib/supabase-client'
import { SidebarInset } from '@/components/ui/sidebar'
import { Loader } from '@/components/ui/loader'
import { AppSidebar } from '@/components/navs/app-sidebar'
import Navbar from '@/components/navs/navbar'
import { AppNav } from '@/components/navs/app-nav'
import { useUserId } from '@/lib/use-auth'
import {
	chatMessagesCollection,
	decksCollection,
	friendSummariesCollection,
	myProfileCollection,
	myProfileQuery,
} from '@/lib/collections'
import { ChatMessageSchema } from '@/lib/schemas'
import { useFontPreference } from '@/hooks/use-font-preference'
import { queryClient } from '@/lib/query-client'

export const Route = createFileRoute('/_user')({
	beforeLoad: ({ context }) => {
		// Auth is optional - RLS handles data security
		// Individual routes can require auth if needed
		return {
			auth: context.auth,
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
			}
		}
	},
	component: UserLayout,
	pendingComponent: Loader,
})

type UserLayoutMatch = RouteMatch<
	unknown,
	unknown,
	unknown,
	unknown,
	unknown,
	unknown,
	unknown
> & {
	loaderData?: {
		SecondSidebar?: ComponentType
	}
}

function UserLayout() {
	const matches = useMatches()
	const matchWithSidebar = matches.findLast(
		(m) => !!(m as UserLayoutMatch)?.loaderData?.SecondSidebar
	) as UserLayoutMatch | undefined
	const SecondSidebar = matchWithSidebar?.loaderData?.SecondSidebar
	const sidebarExact =
		matchWithSidebar && matchWithSidebar.id === matches.at(-1)?.id.slice(0, -1)
	const queryClient = useQueryClient()
	const userId = useUserId()

	// Apply user's font preference to the document body
	useFontPreference()

	// Only set up realtime subscriptions when authenticated
	useEffect(() => {
		if (!userId) return

		const friendRequestChannel = supabase
			.channel('friend-request-action-realtime')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'friend_request_action',
				},
				(payload) => {
					const newAction = payload.new as Tables<'friend_request_action'>
					if (
						newAction.action_type === 'accept' &&
						newAction.uid_for === userId
					)
						toast.success('Friend request accepted')
					if (newAction.action_type === 'accept' && newAction.uid_by === userId)
						toast.success('You are now connected')
					// console.log(`new friend request action has come in`, payload)
					void friendSummariesCollection.utils.refetch()
				}
			)
			.subscribe()

		const chatChannel = supabase
			.channel('user-chats')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'chat_message',
				},
				(payload) => {
					const newMessage = payload.new as Tables<'chat_message'>
					console.log(`new chat`, newMessage)
					chatMessagesCollection.utils.writeInsert(
						ChatMessageSchema.parse(newMessage)
					)
				}
			)
			.subscribe()

		return () => {
			void supabase.removeChannel(friendRequestChannel)
			void supabase.removeChannel(chatChannel)
		}
	}, [userId, queryClient])

	return (
		<div className="flex h-screen w-full">
			<AppSidebar />
			<SidebarInset className="@container flex w-full min-w-0 flex-1 flex-col">
				<Navbar />
				<AppNav />
				{/* min-h-0 is critical: allows flex children to shrink below content size for scrolling */}
				<div className="flex min-h-0 flex-1 flex-row gap-2 p-2">
					{SecondSidebar ?
						<div
							className={`${sidebarExact ? 'flex w-full' : 'hidden'} @xl:flex @xl:w-80`}
							style={{ viewTransitionName: 'second-sidebar' }}
						>
							<SecondSidebar />
						</div>
					:	null}

					<div
						id="app-sidebar-layout-outlet"
						className={`${sidebarExact ? 'hidden' : 'w-full'} @xl:w-app @container min-h-0 @xl:block`}
						style={{ viewTransitionName: 'main-content' }}
					>
						<Outlet />
					</div>
				</div>
			</SidebarInset>
		</div>
	)
}
