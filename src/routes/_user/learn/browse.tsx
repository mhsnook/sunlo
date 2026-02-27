import { useCallback, useEffect } from 'react'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import * as z from 'zod'

import { languagesCollection, langTagsCollection } from '@/features/languages/collections'
import { phrasesCollection } from '@/features/phrases/collections'
import { phraseRequestsCollection } from '@/features/requests/collections'
import {
	phrasePlaylistsCollection,
	playlistPhraseLinksCollection,
} from '@/features/playlists/collections'
import BrowseSearchOverlay from '@/components/browse-search-overlay'

const BrowseSearchParams = z.object({
	search: z.boolean().optional(),
	tags: z.string().optional(),
	langs: z.string().optional(),
})

export const Route = createFileRoute('/_user/learn/browse')({
	validateSearch: BrowseSearchParams,
	beforeLoad: ({ context }) => ({
		titleBar: {
			title: 'Explore Languages',
			subtitle:
				'Browse popular languages, requests, and playlists from our community',
		},
		appnav: ['/learn/browse', '/learn/browse/charts'],
		contextMenu:
			context.auth.isAuth ?
				['/learn/add-deck', '/learn/contributions']
			:	['/login', '/signup'],
	}),
	loader: async () => {
		await languagesCollection.preload()
		await langTagsCollection.preload()
		await phraseRequestsCollection.preload()
		await phrasePlaylistsCollection.preload()
		await phrasesCollection.preload()
		await playlistPhraseLinksCollection.preload()
	},
	component: BrowseLayout,
})

function BrowseLayout() {
	const navigate = Route.useNavigate()
	const { search: isSearchOpen } = Route.useSearch()

	const openSearch = useCallback(() => {
		void navigate({
			search: (prev) => ({ ...prev, search: true }),
			replace: true,
		})
	}, [navigate])

	const closeSearch = useCallback(() => {
		void navigate({
			search: (prev) => {
				const { search: _, ...rest } = prev as Record<string, unknown>
				return rest
			},
			replace: true,
		})
	}, [navigate])

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
		<>
			<Outlet />
			<BrowseSearchOverlay open={!!isSearchOpen} onClose={closeSearch} />
		</>
	)
}
