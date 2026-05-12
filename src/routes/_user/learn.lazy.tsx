import { useCallback, useEffect } from 'react'
import {
	createLazyFileRoute,
	Outlet,
	useParams,
	useRouter,
} from '@tanstack/react-router'

import BrowseSearchOverlay from '@/components/browse-search-overlay'
import languages from '@/lib/languages'

export const Route = createLazyFileRoute('/_user/learn')({
	component: LearnLayout,
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
