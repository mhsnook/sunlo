import { useCallback, useEffect } from 'react'
import { createFileRoute, Outlet, useRouter } from '@tanstack/react-router'
import * as z from 'zod'
import { publicProfilesCollection } from '@/features/profile/collections'
import { friendSummariesCollection } from '@/features/social/collections'
import { RequireAuth } from '@/components/require-auth'
import FriendSearchOverlay from '@/components/friend-search-overlay'

const FriendsSearchParams = z.object({
	search: z.boolean().optional(),
})

export const Route = createFileRoute('/_user/friends')({
	beforeLoad: () => ({
		titleBar: {
			title: 'Friends and Contacts',
		},
		searchAction: true,
		contextMenu: ['/friends/invite'],
	}),
	validateSearch: FriendsSearchParams,
	loader: async ({ context }) => {
		// Only preload if authenticated
		if (!context.auth.isAuth) return
		await Promise.all([
			friendSummariesCollection.preload(),
			publicProfilesCollection.preload(),
		])
	},
	component: FriendsLayout,
})

function setSearchParam(key: string, value: string | null) {
	const url = new URL(window.location.href)
	if (value === null) url.searchParams.delete(key)
	else url.searchParams.set(key, value)
	return url.pathname + url.search
}

function FriendsLayout() {
	const router = useRouter()
	const { search: isSearchOpen } = Route.useSearch()

	const openSearch = useCallback(() => {
		void router.navigate({
			to: setSearchParam('search', 'true'),
			replace: true,
		})
	}, [router])

	const closeSearch = useCallback(() => {
		void router.navigate({
			to: setSearchParam('search', null),
			replace: true,
		})
	}, [router])

	// Ctrl+K / Cmd+K to toggle search overlay
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault()
				if (isSearchOpen) {
					closeSearch()
				} else {
					openSearch()
				}
			}
		}
		window.addEventListener('keydown', handler)
		return () => window.removeEventListener('keydown', handler)
	}, [isSearchOpen, closeSearch, openSearch])

	return (
		<RequireAuth message="Log in to connect with friends, share phrases, and chat.">
			<Outlet />
			{isSearchOpen && <FriendSearchOverlay onClose={closeSearch} />}
		</RequireAuth>
	)
}
