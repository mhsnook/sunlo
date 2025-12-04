import { TitleBar } from '@/types/main'

import { useEffect } from 'react'
import { createFileRoute, Outlet } from '@tanstack/react-router'

import languages from '@/lib/languages'
import { setTheme } from '@/lib/deck-themes'
import {
	cardReviewsCollection,
	cardsCollection,
	decksCollection,
	langTagsCollection,
	phrasesCollection,
	reviewDaysCollection,
} from '@/lib/collections'
import { useDeckMeta } from '@/hooks/use-deck'

export const Route = createFileRoute('/_user/learn/$lang')({
	component: LanguageLayout,
	loader: async ({ params: { lang } }) => {
		const langTagsPromise = langTagsCollection.preload()
		const daysPromise = reviewDaysCollection.preload()
		const reviewsPromise = cardReviewsCollection.preload()
		const phrasesPromise = phrasesCollection.preload()
		void cardsCollection.preload()
		await Promise.all([
			langTagsPromise,
			daysPromise,
			reviewsPromise,
			phrasesPromise,
		])
		const deck = decksCollection.get(lang)

		return {
			appnav: [
				'/learn/$lang/review',
				'/learn/$lang/library',
				'/learn/$lang',
				'/learn/$lang/requests',
			],
			contextMenu: [
				'/learn/$lang/search',
				'/learn/$lang/requests/new',
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
	const params = Route.useParams()
	const { data: deck } = useDeckMeta(params.lang)
	useEffect(() => {
		if (typeof deck?.theme === 'number')
			setTheme(document.documentElement, deck?.theme ?? undefined)
		return () => {
			setTheme()
		}
	}, [deck?.theme])
	return <Outlet />
}
