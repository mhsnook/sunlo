import { createFileRoute } from '@tanstack/react-router'

import {
	languagesCollection,
	langTagsCollection,
} from '@/features/languages/collections'
import { phrasesCollection } from '@/features/phrases/collections'
import { phraseRequestsCollection } from '@/features/requests/collections'
import {
	phrasePlaylistsCollection,
	playlistPhraseLinksCollection,
} from '@/features/playlists/collections'

export const Route = createFileRoute('/_user/learn/browse')({
	beforeLoad: ({ context }) => ({
		titleBar: {
			title: 'Explore Languages',
			subtitle:
				'Browse popular languages, requests, and playlists from our community',
		},
		appnav: ['/learn/browse', '/learn/browse/charts'],
		contextMenu:
			context.auth.isAuth ?
				['/learn/add-deck', '/learn/contributions']
			:	['/login', '/signup'],
	}),
	loader: async () => {
		await Promise.all([
			languagesCollection.preload(),
			langTagsCollection.preload(),
			phraseRequestsCollection.preload(),
			phrasePlaylistsCollection.preload(),
			phrasesCollection.preload(),
			playlistPhraseLinksCollection.preload(),
		])
	},
})
