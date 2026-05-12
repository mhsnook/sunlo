import { useEffect } from 'react'
import { createLazyFileRoute, Outlet } from '@tanstack/react-router'

import { setTheme } from '@/lib/deck-themes'
import { todayString } from '@/lib/utils'
import { useDeckMeta } from '@/features/deck/hooks'
import { ReviewStoreProvider } from '@/components/review/review-context-provider'

export const Route = createLazyFileRoute('/_user/learn/$lang')({
	component: LanguageLayout,
})

function LanguageLayout() {
	const params = Route.useParams()
	const { data: deck } = useDeckMeta(params.lang)
	const dayString = todayString()

	useEffect(() => {
		if (typeof deck?.theme === 'number')
			setTheme(document.documentElement, deck?.theme ?? undefined)
		return () => {
			setTheme()
		}
	}, [deck?.theme])

	return (
		<ReviewStoreProvider lang={params.lang} dayString={dayString}>
			<Outlet />
		</ReviewStoreProvider>
	)
}
