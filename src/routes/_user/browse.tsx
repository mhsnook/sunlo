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

export const Route = createFileRoute('/_user/browse')({
	staticData: {
		search: 'content',
		appnav: ['/browse', '/browse/charts'],
		contextMenu: [
			['/learn/add-deck', '/learn/contributions'],
			['/login', '/signup'],
		],
		titleBar: {
			title: 'Explore Languages',
			subtitle: 'Browse the public library',
		},
	},
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
