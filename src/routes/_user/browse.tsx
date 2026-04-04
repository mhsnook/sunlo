import { useCallback, useEffect } from 'react'
import { createFileRoute, Outlet, useRouter } from '@tanstack/react-router'
import * as z from 'zod'

import {
	languagesCollection,
	langTagsCollection,
} from '@/features/languages/collections'
import { phrasesCollection } from '@/features/phrases/collections'
import { phraseRequestsCollection } from '@/features/requests/collections'
import {
	phrasePlaylistsCollection,
	playlistPhraseLinksCollection,
} from '@/features/playlists/collections'
import BrowseSearchOverlay from '@/components/browse-search-overlay'

const BrowseSearchParams = z.object({
	search: z.boolean().optional(),
})

export const Route = createFileRoute('/_user/browse')({
	component: BrowseLayout,
	validateSearch: BrowseSearchParams,
	beforeLoad: ({ context }) => ({
		titleBar: {
			title: 'Explore Languages',
			subtitle: 'Browse the public library',
		},
		appnav: ['/browse', '/browse/charts'],
		contextMenu:
			context.auth.isAuth ?
				['/learn/add-deck', '/learn/contributions']
			:	['/login', '/signup'],
	}),
	loader: async () => {
		await Promise.all([
			languagesCollection.preload(),
			langTagsCollection.preload(),
			phraseRequestsCollection.preload(),
			phrasePlaylistsCollection.preload(),
			phrasesCollection.preload(),
			playlistPhraseLinksCollection.preload(),
		])
	},
})

function setSearchParam(key: string, value: string | null) {
	const url = new URL(window.location.href)
	if (value === null) url.searchParams.delete(key)
	else url.searchParams.set(key, value)
	return url.pathname + url.search
}

function BrowseLayout() {
	const router = useRouter()
	const { search: isSearchOpen } = Route.useSearch()

	const openSearch = useCallback(() => {
		void router.navigate({
			to: setSearchParam('search', 'true'),
			replace: true,
		})
	}, [router])

	const closeSearch = useCallback(() => {
		void router.navigate({ to: setSearchParam('search', null), replace: true })
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
		<div className="h-full space-y-4">
			<Outlet />
			{isSearchOpen && <BrowseSearchOverlay onClose={closeSearch} />}
		</div>
	)
}
