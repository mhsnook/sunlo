import { createFileRoute, notFound } from '@tanstack/react-router'

import languages from '@/lib/languages'
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
	phraseRequestsCollection,
	phraseRequestUpvotesCollection,
} from '@/features/requests/collections'

export const Route = createFileRoute('/_user/learn/$lang')({
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
			appnav: context.auth.isAuth
				? [
						'/learn/$lang/feed',
						'/learn/$lang/review',
						'/learn/$lang/contributions',
						'/learn/$lang/stats',
					]
				: ['/learn/$lang/feed'],
			contextMenu: context.auth.isAuth
				? [
						'/learn/$lang/manage-deck',
						'/learn/$lang/requests/new',
						'/learn/$lang/phrases/new',
						'/learn/$lang/playlists/new',
						'/learn/$lang/deck-settings',
					]
				: [],
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
