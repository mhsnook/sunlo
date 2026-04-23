// Feature: playlists — Phrase playlists & links
// Public API for the playlists domain

// Schemas & types
export {
	PhrasePlaylistSchema,
	type PhrasePlaylistType,
	PlaylistPhraseLinkSchema,
	type PlaylistPhraseLinkType,
	PhrasePlaylistUpvoteSchema,
	type PhrasePlaylistUpvoteType,
	PhrasePlaylistInsertSchema,
	type PhrasePlaylistInsertType,
	PhrasePlaylistUpdateSchema,
	type PhrasePlaylistUpdateType,
	PlaylistPhraseLinkIncludedInsertSchema,
	type PlaylistPhraseLinkIncludedInsertType,
	validateUrl,
} from './schemas'

// Collections
export {
	phrasePlaylistsCollection,
	playlistPhraseLinksCollection,
	phrasePlaylistUpvotesCollection,
} from './collections'

// Live collections
export { phrasePlaylistsActive } from './live'

// Hooks
export {
	useAnyonesPlaylists,
	useLangPlaylists,
	useMyPlaylists,
	useOnePlaylist,
	useOnePlaylistPhrases,
	useHasPlaylistUpvote,
} from './hooks'
