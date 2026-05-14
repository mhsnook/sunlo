import {
	phrasePlaylistsQuery,
	playlistPhraseLinksQuery,
	phrasePlaylistUpvotesQuery,
} from '@/features/playlists/queries'
import { queryClient } from '@/lib/query-client'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/learn/$lang/playlists')({
	loader: async ({ context }) => {
		const preloads: Promise<unknown>[] = [
			queryClient.ensureQueryData(phrasePlaylistsQuery),
			queryClient.ensureQueryData(playlistPhraseLinksQuery),
		]
		if (context.auth.isAuth) {
			preloads.push(queryClient.ensureQueryData(phrasePlaylistUpvotesQuery))
		}
		await Promise.all(preloads)
	},
})
