import { useEffect } from 'react'
import { createFileRoute, Outlet, notFound } from '@tanstack/react-router'

import languages from '@/lib/languages'
import { setLangTheme, useLangPopularityReady } from '@/lib/lang-theme'
import { todayString } from '@/lib/utils'
import { langTagsCollection } from '@/features/languages/collections'
import { phrasesCollection } from '@/features/phrases/collections'
import { cardsCollection, decksCollection } from '@/features/deck/collections'
import { publicProfilesCollection } from '@/features/profile/collections'
import {
	cardReviewsCollection,
	reviewDaysCollection,
} from '@/features/review/collections'
import {
	phrasePlaylistsCollection,
	playlistPhraseLinksCollection,
} from '@/features/playlists/collections'
import {
	messageTagLinksCollection,
	messageTagsCollection,
	phraseRequestsCollection,
	phraseRequestUpvotesCollection,
} from '@/features/requests/collections'
import { ReviewStoreProvider } from '@/components/review/review-context-provider'

export const Route = createFileRoute('/_user/learn/$lang')({
	component: LanguageLayout,
	staticData: {
		search: 'content',
		appnav: [
			[
				'/learn/$lang/feed',
				'/learn/$lang/review',
				'/learn/$lang/contributions',
				'/learn/$lang/stats',
			],
			['/learn/$lang/feed'],
		],
		contextMenu: [
			[
				'/learn/$lang/manage-deck',
				'/learn/$lang/requests/new',
				'/learn/$lang/phrases/new',
				'/learn/$lang/playlists/new',
				'/learn/$lang/deck-settings',
			],
		],
		titleBar: ({ params }) => ({ title: `${languages[params.lang]} Deck` }),
	},
	beforeLoad: ({ params: { lang } }) => {
		if (!languages[lang]) {
			console.log(`not found`)
			throw notFound()
		}
	},
	loader: async ({ context }) => {
		const preloads: Promise<unknown>[] = [
			langTagsCollection.preload(),
			phrasesCollection.preload(),
			publicProfilesCollection.preload(),
			phrasePlaylistsCollection.preload(),
			playlistPhraseLinksCollection.preload(),
			phraseRequestsCollection.preload(),
			messageTagsCollection.preload(),
			messageTagLinksCollection.preload(),
		]
		if (context.auth.isAuth) {
			preloads.push(
				reviewDaysCollection.preload(),
				cardReviewsCollection.preload(),
				cardsCollection.preload(),
				decksCollection.preload(),
				phraseRequestUpvotesCollection.preload()
			)
		}
		await Promise.all(preloads)
	},
})

function LanguageLayout() {
	const params = Route.useParams()
	const dayString = todayString()
	const ready = useLangPopularityReady()

	useEffect(() => {
		if (!ready) return
		setLangTheme(document.documentElement, params.lang)
		return () => {
			setLangTheme()
		}
	}, [params.lang, ready])

	return (
		<ReviewStoreProvider lang={params.lang} dayString={dayString}>
			<Outlet />
		</ReviewStoreProvider>
	)
}
