import { createFileRoute, Outlet } from '@tanstack/react-router'

import {
	languagesCollection,
	langTagsCollection,
	phraseRequestsCollection,
	phrasePlaylistsCollection,
	phrasesCollection,
	playlistPhraseLinksCollection,
} from '@/lib/collections'

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
				['/learn/add-deck', '/learn/contributions', '/learn/quick-search']
			:	['/login', '/signup'],
	}),
	loader: async () => {
		await languagesCollection.preload()
		await langTagsCollection.preload()
		await phraseRequestsCollection.preload()
		await phrasePlaylistsCollection.preload()
		await phrasesCollection.preload()
		await playlistPhraseLinksCollection.preload()
	},
	component: () => <Outlet />,
})
