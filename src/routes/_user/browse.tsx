import { createFileRoute } from '@tanstack/react-router'

import { languagesQuery, langTagsQuery } from '@/features/languages/queries'
import { phrasesQuery } from '@/features/phrases/queries'
import { phraseRequestsQuery } from '@/features/requests/queries'
import {
	phrasePlaylistsQuery,
	playlistPhraseLinksQuery,
} from '@/features/playlists/queries'
import { queryClient } from '@/lib/query-client'

export const Route = createFileRoute('/_user/browse')({
	beforeLoad: ({ context }) => ({
		titleBar: {
			title: 'Explore Languages',
			subtitle: 'Browse the public library',
		},
		appnav: ['/browse', '/browse/charts'],
		contextMenu: context.auth.isAuth
			? ['/learn/add-deck', '/learn/contributions']
			: ['/login', '/signup'],
	}),
	loader: async () => {
		await Promise.all([
			queryClient.ensureQueryData(languagesQuery),
			queryClient.ensureQueryData(langTagsQuery),
			queryClient.ensureQueryData(phraseRequestsQuery),
			queryClient.ensureQueryData(phrasePlaylistsQuery),
			queryClient.ensureQueryData(phrasesQuery),
			queryClient.ensureQueryData(playlistPhraseLinksQuery),
		])
	},
})
