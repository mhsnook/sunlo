import {
	phrasePlaylistsCollection,
	playlistPhraseLinksCollection,
} from '@/lib/collections'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/learn/$lang/playlists')({
	loader: async () => {
		await Promise.all([
			phrasePlaylistsCollection.preload(),
			playlistPhraseLinksCollection.preload(),
		])
	},
})
