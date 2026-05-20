import { lazy, Suspense, useEffect, useRef } from 'react'
import { createFileRoute, Outlet, useMatches } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { SidebarInset, useSidebar } from '@/components/ui/sidebar'
import { Loader } from '@/components/ui/loader'
import Navbar from '@/components/navs/navbar'

const AppSidebar = lazy(() =>
	import('@/components/navs/app-sidebar').then((m) => ({
		default: m.AppSidebar,
	}))
)
const AppNav = lazy(() =>
	import('@/components/navs/app-nav').then((m) => ({ default: m.AppNav }))
)
import { RightSidebar } from '@/components/navs/right-sidebar'
import type { MyRouterContext } from './__root'
import { myProfileCollection } from '@/features/profile/collections'
import { decksCollection } from '@/features/deck/collections'
import { friendSummariesCollection } from '@/features/social/collections'
import { useSocialRealtime } from '@/features/social'
import { notificationsCollection } from '@/features/notifications/collections'
import { useNotificationsRealtime } from '@/features/notifications/hooks'
import { useFontPreference } from '@/hooks/use-font-preference'

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
	loader: async ({ context }) => {
		// If not authenticated, skip user-specific loading
		if (!context.auth.isAuth) return

		// Every authenticated user has a profile row — a trigger creates it
		// on signup, so there is no "no profile" case to redirect around.
		// Make sure the collection is populated before first render: NavUser
		// and other components call useProfile() unconditionally.
		if (myProfileCollection.status === 'error') {
			console.log(
				`myProfileCollection is in an error state. We'll clean it up and reload it.`
			)
			await myProfileCollection.cleanup()
		}
		await myProfileCollection.preload()

		void decksCollection.preload()
		void friendSummariesCollection.preload()
		void notificationsCollection.preload()
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

	// Skip the AppNav chunk entirely when no route declares an appnav
	const appnavMatch = matches.findLast(
		(m) => (m.context as MyRouterContext)?.appnav
	)
	const hasAppNav = !!(appnavMatch?.context as MyRouterContext)?.appnav?.length

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

	// Subscribe to realtime friend-request, chat-message, and notification events
	useSocialRealtime()
	useNotificationsRealtime()

	return (
		<div
			className={cn('flex w-full', fixedHeight ? 'h-screen' : 'min-h-screen')}
		>
			<Suspense
				fallback={
					<div
						aria-hidden
						className="hidden h-svh w-(--sidebar-width) shrink-0 md:block"
					/>
				}
			>
				<AppSidebar focusMode={focusMode} />
			</Suspense>
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
						{hasAppNav && (
							<Suspense
								fallback={
									<div
										aria-hidden
										className="bg-base-lo-neutral mt-1 -mb-[2px] h-12"
									/>
								}
							>
								<AppNav />
							</Suspense>
						)}
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
