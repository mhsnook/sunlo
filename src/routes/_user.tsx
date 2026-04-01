import { useEffect, useRef } from 'react'
import {
	createFileRoute,
	Outlet,
	redirect,
	useMatches,
} from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { SidebarInset, useSidebar } from '@/components/ui/sidebar'
import { Loader } from '@/components/ui/loader'
import { AppSidebar } from '@/components/navs/app-sidebar'
import Navbar from '@/components/navs/navbar'
import { AppNav } from '@/components/navs/app-nav'
import { RightSidebar } from '@/components/navs/right-sidebar'
import type { MyRouterContext } from './__root'
import {
	myProfileCollection,
	myProfileQuery,
} from '@/features/profile/collections'
import { decksCollection } from '@/features/deck/collections'
import { friendSummariesCollection } from '@/features/social/collections'
import { useSocialRealtime } from '@/features/social'
import { useFontPreference } from '@/hooks/use-font-preference'
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

function UserLayout() {
	const matches = useMatches()
	// Check if any route has enabled focus mode (e.g. review/go)
	const focusMode = matches.some(
		(m) => (m.context as MyRouterContext)?.focusMode
	)

	// Check if any route requests wider content (e.g. chats)
	const wideContent = matches.some(
		(m) => (m.context as MyRouterContext)?.wideContent
	)

	// Check if any route requests fixed-height layout (e.g. chats, review)
	// Layout A (default): page flows naturally, one browser scrollbar
	// Layout B (fixedHeight): viewport-locked container with internal scroll
	const fixedHeight = matches.some(
		(m) => (m.context as MyRouterContext)?.fixedHeight
	)

	// Auto-collapse sidebar when entering focus mode, restore when leaving
	const { setOpen, open } = useSidebar()
	const savedOpenState = useRef(open)
	useEffect(() => {
		if (focusMode) {
			savedOpenState.current = open
			setOpen(false)
		} else {
			setOpen(savedOpenState.current)
		}
	}, [focusMode])

	// Apply user's font preference to the document body
	useFontPreference()

	// Subscribe to realtime friend-request and chat-message events
	useSocialRealtime()

	return (
		<div
			className={cn('flex w-full', fixedHeight ? 'h-screen' : 'min-h-screen')}
		>
			<AppSidebar focusMode={focusMode} />
			<SidebarInset className="@container flex w-full min-w-0 flex-1 flex-col">
				<div className={cn('flex flex-1 flex-row', fixedHeight && 'min-h-0')}>
					<div
						className={cn(
							'mx-auto flex min-w-0 flex-1 flex-col overflow-x-clip',
							wideContent ? 'max-w-6xl' : 'max-w-4xl',
							fixedHeight && 'min-h-0 overflow-y-auto'
						)}
					>
						<Navbar />
						<AppNav />
						<div
							id="app-sidebar-layout-outlet"
							className={cn(
								'@container flex grow flex-col p-2',
								fixedHeight ? 'min-h-0' : !focusMode && 'pb-8'
							)}
							style={{ viewTransitionName: 'main-content' }}
						>
							<Outlet />
						</div>
					</div>
					<RightSidebar />
				</div>
			</SidebarInset>
		</div>
	)
}
