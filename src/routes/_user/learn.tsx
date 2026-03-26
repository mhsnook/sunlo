import { useCallback, useEffect } from 'react'
import {
	createFileRoute,
	Outlet,
	useParams,
	useRouter,
} from '@tanstack/react-router'
import * as z from 'zod'

import { PendingRequestsHeader } from './friends/-pending-requests-header'
import BrowseSearchOverlay from '@/components/browse-search-overlay'
import languages from '@/lib/languages'

const LearnSearchParams = z.object({
	search: z.boolean().optional(),
})

export const Route = createFileRoute('/_user/learn')({
	component: LearnLayout,
	validateSearch: LearnSearchParams,
	beforeLoad: ({ context }) => ({
		titleBar: {
			title: 'Learning Home',
			subtitle:
				context.auth.isAuth ?
					'Which deck are we studying today?'
				:	'Explore community-created language learning content',
		},
		searchAction: true,
		appnav:
			context.auth.isAuth ?
				['/learn', '/friends', '/learn/contributions', '/learn/add-deck']
			:	['/learn', '/learn/browse'],
		contextMenu: context.auth.isAuth ? ['/learn/add-deck'] : [],
	}),
})

function setSearchParam(key: string, value: string | null) {
	const url = new URL(window.location.href)
	if (value === null) url.searchParams.delete(key)
	else url.searchParams.set(key, value)
	return url.pathname + url.search
}

function LearnLayout() {
	const router = useRouter()
	const { search: isSearchOpen } = Route.useSearch()
	const { lang } = useParams({ strict: false })

	// Pre-filter by the current deck language if we're inside a $lang route
	const initialLangs = lang && lang in languages ? [lang] : undefined

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
			<PendingRequestsHeader shy />
			<Outlet />
			{isSearchOpen && (
				<BrowseSearchOverlay
					onClose={closeSearch}
					initialLangs={initialLangs}
				/>
			)}
		</div>
	)
}
