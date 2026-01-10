import { useEffect } from 'react'
import { createFileRoute, Outlet } from '@tanstack/react-router'

import languages from '@/lib/languages'
import { setTheme } from '@/lib/deck-themes'
import {
	cardReviewsCollection,
	cardsCollection,
	langTagsCollection,
	phrasesCollection,
	reviewDaysCollection,
} from '@/lib/collections'
import { useDeckMeta } from '@/hooks/use-deck'

export const Route = createFileRoute('/_user/learn/$lang')({
	component: LanguageLayout,
	beforeLoad: ({ params: { lang }, context }) => ({
		titleBar: {
			title: `${languages[lang]} Deck`,
		},
		appnav:
			context.auth.isAuth ?
				[
					'/learn/$lang/feed',
					'/learn/$lang/review',
					'/learn/$lang/contributions',
					'/learn/$lang/stats',
					'/learn/$lang/search',
				]
			:	['/learn/$lang/feed', '/learn/$lang/search'],
		contextMenu:
			context.auth.isAuth ?
				[
					'/learn/$lang/search',
					'/learn/$lang/requests/new',
					'/learn/$lang/add-phrase',
					'/learn/$lang/deck-settings',
				]
			:	[],
	}),
	loader: async () => {
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
