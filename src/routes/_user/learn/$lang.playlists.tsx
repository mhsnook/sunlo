import {
	phrasePlaylistsCollection,
	playlistPhraseLinksCollection,
	phrasePlaylistUpvotesCollection,
} from '@/features/playlists/collections'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/learn/$lang/playlists')({
	loader: async ({ context }) => {
		const preloads: Promise<unknown>[] = [
			phrasePlaylistsCollection.preload(),
			playlistPhraseLinksCollection.preload(),
		]
		if (context.auth.isAuth) {
			preloads.push(phrasePlaylistUpvotesCollection.preload())
		}
		await Promise.all(preloads)
	},
})
