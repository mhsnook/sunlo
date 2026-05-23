import { lazy, Suspense, useCallback, useEffect, useRef } from 'react'
import {
	createFileRoute,
	Outlet,
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
import { queryClient } from '@/lib/query-client'
import { decksCollection } from '@/features/deck/collections'
import { friendSummariesCollection } from '@/features/social/collections'
import { useSocialRealtime } from '@/features/social'
import { notificationsCollection } from '@/features/notifications/collections'
import { languagesCollection } from '@/features/languages/collections'
import { useNotificationsRealtime } from '@/features/notifications/hooks'
import { useFontPreference } from '@/hooks/use-font-preference'

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
	loader: async ({ context }) => {
		// If not authenticated, skip user-specific loading
		if (!context.auth.isAuth) return

		// The profile collection must be populated before first render —
		// NavUser, OnboardingNudge and others call useProfile() unconditionally.
		await myProfileCollection.preload()

		// Belt-and-suspenders: clearUser on the auth flip already cleaned
		// this up. If we still see size 0, force a fresh sync — synchronous
		// removeQueries (cleanup's own runs async-after-await and races
		// preload), cleanup() to flip off `ready`, then preload() to refetch.
		if (myProfileCollection.size === 0) {
			queryClient.removeQueries({ queryKey: myProfileQuery.queryKey })
			await myProfileCollection.cleanup()
			await myProfileCollection.preload()
		}

		// Invariant: handle_new_user() + the migration backfill guarantee a
		// user_profile row for every confirmed auth user. If the collection is
		// still empty after a clean authenticated fetch, the invariant is
		// broken — fail loudly rather than let the user roam a nameless,
		// half-working app with no recovery path.
		if (myProfileCollection.size === 0) {
			console.error(
				`No user_profile row for authenticated user ${context.auth.userId} — ` +
					`the handle_new_user trigger or backfill did not run for this account.`
			)
			throw new Error(
				"We couldn't load your account profile. Try refreshing the page — if this keeps happening, please contact support."
			)
		}

		void decksCollection.preload()
		void friendSummariesCollection.preload()
		void notificationsCollection.preload()
		void languagesCollection.preload()
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
