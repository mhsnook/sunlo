import { createFileRoute, notFound } from '@tanstack/react-router'

import languages from '@/lib/languages'
import { langTagsQuery } from '@/features/languages/queries'
import { phrasesQuery } from '@/features/phrases/queries'
import { cardsQuery, decksQuery } from '@/features/deck/queries'
import { publicProfilesQuery } from '@/features/profile/queries'
import { cardReviewsQuery, reviewDaysQuery } from '@/features/review/queries'
import {
	phrasePlaylistsQuery,
	playlistPhraseLinksQuery,
} from '@/features/playlists/queries'
import {
	phraseRequestsQuery,
	phraseRequestUpvotesQuery,
} from '@/features/requests/queries'
import { queryClient } from '@/lib/query-client'

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
			queryClient.ensureQueryData(langTagsQuery),
			queryClient.ensureQueryData(phrasesQuery),
			queryClient.ensureQueryData(publicProfilesQuery),
			queryClient.ensureQueryData(phrasePlaylistsQuery),
			queryClient.ensureQueryData(playlistPhraseLinksQuery),
			queryClient.ensureQueryData(phraseRequestsQuery),
		]
		if (context.auth.isAuth) {
			preloads.push(
				queryClient.ensureQueryData(reviewDaysQuery),
				queryClient.ensureQueryData(cardReviewsQuery),
				queryClient.ensureQueryData(cardsQuery),
				queryClient.ensureQueryData(decksQuery),
				queryClient.ensureQueryData(phraseRequestUpvotesQuery)
			)
		}
		await Promise.all(preloads)
	},
})
