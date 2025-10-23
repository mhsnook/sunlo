import { TitleBar } from '@/types/main'

import { useEffect } from 'react'
import { createFileRoute, Outlet } from '@tanstack/react-router'

import languages from '@/lib/languages'
import { setTheme } from '@/lib/deck-themes'
import {
	cardReviewsCollection,
	decksCollection,
	reviewDaysCollection,
} from '@/lib/collections'
import { phrasesFull } from '@/lib/live-collections'

export const Route = createFileRoute('/_user/learn/$lang')({
	component: LanguageLayout,
	loader: async ({ params: { lang } }) => {
		const decksPromise = decksCollection.preload()
		const daysPromise = reviewDaysCollection.preload()
		const reviewsPromise = cardReviewsCollection.preload()
		const phrasesPromise = phrasesFull.preload()
		await Promise.all([
			decksPromise,
			daysPromise,
			reviewsPromise,
			phrasesPromise,
		])
		const deck = decksCollection.get(lang)

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
			theme: deck?.theme,
		}
	},
})

function LanguageLayout() {
	const { theme } = Route.useLoaderData()
	useEffect(() => {
		setTheme(document.documentElement, theme)
		return () => {
			console.log('removing theme')
			setTheme()
		}
	}, [theme])
	return <Outlet />
}
