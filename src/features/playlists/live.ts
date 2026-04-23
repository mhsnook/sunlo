import { createLiveQueryCollection, eq } from '@tanstack/db'
import { phrasePlaylistsCollection } from './collections'

/**
 * Phrase playlists with `deleted = false` pre-filtered.
 * Use this anywhere you want the "live" set of playlists visible to users.
 */
export const phrasePlaylistsActive = createLiveQueryCollection({
	query: (q) =>
		q
			.from({ playlist: phrasePlaylistsCollection })
			.where(({ playlist }) => eq(playlist.deleted, false)),
})
