import { TitleBar } from '@/types/main'

import { useEffect } from 'react'
import { createFileRoute, Outlet } from '@tanstack/react-router'

import languages from '@/lib/languages'
import { setTheme } from '@/lib/deck-themes'
import { decksCollection } from '@/lib/collections'

export const Route = createFileRoute('/_user/learn/$lang')({
	component: LanguageLayout,
	loader: async ({ params: { lang } }) => {
		await decksCollection.preload()
		const decks = decksCollection.toArray
		const theme = decks.findIndex((d) => (d.lang = lang))

		return {
			appnav: [
				'/learn/$lang',
				'/learn/$lang/review',
				'/learn/$lang/library',
				'/learn/$lang/requests',
				'/learn/$lang/search',
				'/learn/$lang/add-phrase',
			],
			contextMenu: [
				'/learn/$lang/search',
				'/learn/$lang/add-phrase',
				'/learn/$lang/deck-settings',
			],
			titleBar: {
				title: `${languages[lang]} Deck`,
			} as TitleBar,
			theme,
		}
	},
})

function LanguageLayout() {
	const { theme } = Route.useLoaderData()
	useEffect(() => {
		if (theme) setTheme(document.documentElement, theme)
		return () => {
			setTheme(document.documentElement)
		}
	}, [theme])
	return <Outlet />
}
