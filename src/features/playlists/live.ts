import { createLiveQueryCollection, eq } from '@tanstack/db'
import {
	phrasePlaylistsCollection,
	playlistPhraseLinksCollection,
} from './collections'

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

/**
 * Playlist-to-phrase links with `deleted = false` pre-filtered.
 * Use this anywhere you want the phrases a playlist actually holds.
 */
export const playlistPhraseLinksActive = createLiveQueryCollection({
	query: (q) =>
		q
			.from({ link: playlistPhraseLinksCollection })
			.where(({ link }) => eq(link.deleted, false)),
})
