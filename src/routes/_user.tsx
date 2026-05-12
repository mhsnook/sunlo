import { lazy, Suspense, useCallback, useEffect, useRef } from 'react'
import {
	createFileRoute,
	Outlet,
	redirect,
	useMatches,
	useParams,
	useRouter,
} from '@tanstack/react-router'
import * as z from 'zod'
import { cn } from '@/lib/utils'
import { SidebarInset, useSidebar } from '@/components/ui/sidebar'
import { Loader } from '@/components/ui/loader'
import Navbar from '@/components/navs/navbar'
import BrowseSearchOverlay from '@/components/browse-search-overlay'
import FriendSearchOverlay from '@/components/friend-search-overlay'
import languages from '@/lib/languages'
import type { SearchScope } from '@/types/route-static-data'

const AppSidebar = lazy(() =>
	import('@/components/navs/app-sidebar').then((m) => ({
		default: m.AppSidebar,
	}))
)
const AppNav = lazy(() =>
	import('@/components/navs/app-nav').then((m) => ({ default: m.AppNav }))
)
import { RightSidebar } from '@/components/navs/right-sidebar'
import { resolveNavList } from '@/types/route-static-data'
import {
	myProfileCollection,
	myProfileQuery,
} from '@/features/profile/collections'
import { decksCollection } from '@/features/deck/collections'
import { friendSummariesCollection } from '@/features/social/collections'
import { useSocialRealtime } from '@/features/social'
import { notificationsCollection } from '@/features/notifications/collections'
import { useNotificationsRealtime } from '@/features/notifications/hooks'
import { useFontPreference } from '@/hooks/use-font-preference'
import { queryClient } from '@/lib/query-client'

const UserSearchParams = z.object({
	search: z.boolean().optional(),
})

export const Route = createFileRoute('/_user')({
	// Auth is optional at this layout — RLS handles data security and
	// individual routes can require auth if needed.
	staticData: {
		titleBar: {
			title: 'Learning Home',
			subtitle: 'Which deck are we studying today?',
		},
	},
	validateSearch: UserSearchParams,
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
	component: UserLayout,
	pendingComponent: Loader,
})

function setSearchParam(key: string, value: string | null) {
	const url = new URL(window.location.href)
	if (value === null) url.searchParams.delete(key)
	else url.searchParams.set(key, value)
	return url.pathname + url.search
}

function UserLayout() {
	const { auth } = Route.useRouteContext()
	const matches = useMatches()

	const focusMode = matches.some((m) => m.staticData.focusMode)
	const wideContent = matches.some((m) => m.staticData.wideContent)
	// Layout A (default): page flows naturally, one browser scrollbar
	// Layout B (fixedHeight): viewport-locked container with internal scroll
	const fixedHeight = matches.some((m) => m.staticData.fixedHeight)

	// Skip the AppNav chunk entirely when no route declares an appnav
	const appnav = matches.findLast((m) => m.staticData.appnav)?.staticData.appnav
	const hasAppNav = !!resolveNavList(appnav, auth.isAuth).length

	// Resolve the search overlay the same way titleBar / appnav are resolved:
	// the deepest match that declares `search` wins.
	const searchScope: SearchScope | undefined = matches.findLast(
		(m) => m.staticData.search
	)?.staticData.search
	const { search: isSearchOpen } = Route.useSearch()
	const router = useRouter()
	const { lang } = useParams({ strict: false })
	const initialLangs = lang && lang in languages ? [lang] : undefined

	const closeSearch = useCallback(() => {
		void router.navigate({ to: setSearchParam('search', null), replace: true })
	}, [router])

	// Ctrl+K / Cmd+K toggles the overlay on any route that opts into a search
	// scope. Disabled on routes that don't, so /search itself, the legacy /chat,
	// etc. keep their own keybindings free.
	useEffect(() => {
		if (!searchScope) return
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault()
				void router.navigate({
					to: setSearchParam('search', isSearchOpen ? null : 'true'),
					replace: true,
				})
			}
		}
		window.addEventListener('keydown', handler)
		return () => window.removeEventListener('keydown', handler)
	}, [searchScope, isSearchOpen, router])

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
		// Fires only on focusMode transitions. Including `open` in the deps
		// would re-save and re-fire every time the user toggles the sidebar,
		// defeating the save/restore.
		// oxlint-disable-next-line react-hooks/exhaustive-deps
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
			{isSearchOpen && searchScope === 'content' && (
				<BrowseSearchOverlay
					onClose={closeSearch}
					initialLangs={initialLangs}
				/>
			)}
			{isSearchOpen && searchScope === 'profiles' && (
				<FriendSearchOverlay onClose={closeSearch} />
			)}
		</div>
	)
}
