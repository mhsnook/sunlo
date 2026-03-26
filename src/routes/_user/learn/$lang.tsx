import { useEffect } from 'react'
import { createFileRoute, Outlet, notFound } from '@tanstack/react-router'

import languages from '@/lib/languages'
import { setTheme } from '@/lib/deck-themes'
import { todayString } from '@/lib/utils'
import { langTagsCollection } from '@/features/languages/collections'
import { phrasesCollection } from '@/features/phrases/collections'
import { cardsCollection } from '@/features/deck/collections'
import {
	cardReviewsCollection,
	reviewDaysCollection,
} from '@/features/review/collections'
import { useDeckMeta } from '@/features/deck/hooks'
import { ReviewStoreProvider } from '@/components/review/review-context-provider'

export const Route = createFileRoute('/_user/learn/$lang')({
	component: LanguageLayout,
	beforeLoad: ({ params: { lang }, context }) => {
		if (!languages[lang]) {
			console.log(`not found`)
			throw notFound()
		}
		return {
			titleBar: {
				title: `${languages[lang]} Deck`,
			},
			searchAction: true,
			appnav:
				context.auth.isAuth ?
					[
						'/learn/$lang/feed',
						'/learn/$lang/review',
						'/learn/$lang/contributions',
						'/learn/$lang/stats',
					]
				:	['/learn/$lang/feed'],
			contextMenu:
				context.auth.isAuth ?
					[
						'/learn/$lang/requests/new',
						'/learn/$lang/phrases/new',
						'/learn/$lang/deck-settings',
					]
				:	[],
		}
	},
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
