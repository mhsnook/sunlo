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
import { authLifecycle } from '@/lib/auth-lifecycle'
import { useDeckMeta } from '@/features/deck/hooks'
import { useSocialRealtime } from '@/features/social'
import { languagesCollection } from '@/features/languages/collections'
import { useNotificationsRealtime } from '@/features/notifications/hooks'
import { useUserRealtime } from '@/hooks/use-user-realtime'
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
	loader: async ({ context: { auth } }) => {
		// Public/shared, fires regardless of auth state.
		void languagesCollection.preload()
		if (!auth.isAuth) return
		await authLifecycle.loadAllTheRequiredUserDataAfterNewLogin(auth.userId!)
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
	const chromeless = matches.some((m) => m.staticData.chromeless)

	// Skip the AppNav chunk entirely when no route declares an appnav
	const appnav = matches.findLast((m) => m.staticData.appnav)?.staticData.appnav

	// Resolve the search overlay the same way titleBar / appnav are resolved:
	// the deepest match that declares `search` wins.
	const searchScope: SearchScope | undefined = matches.findLast(
		(m) => m.staticData.search
	)?.staticData.search
	const { search: isSearchOpen } = Route.useSearch()
	const router = useRouter()
	const { lang } = useParams({ strict: false })
	const initialLangs = lang && lang in languages ? [lang] : undefined

	// $lang appnav is deck-specific (feed/review/contributions/stats). Hide it
	// when the visitor has no active deck for this language — they're browsing,
	// not learning, and the deck-scoped links would only lead to dead pages.
	const langGatesAppNav = !!lang && lang in languages
	const { data: currentDeck } = useDeckMeta(langGatesAppNav ? lang : '')
	const hasActiveDeckForLang =
		!langGatesAppNav || (!!currentDeck && !currentDeck.archived)
	const hasAppNav =
		hasActiveDeckForLang && !!resolveNavList(appnav, auth.isAuth).length

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
	// Realtime for the user-specific tables (upvotes, deck, cards, reviews)
	useUserRealtime()

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
						{!chromeless && <Navbar />}
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
