# learner edits their playlist

cleanup: supabase.from('phrase_playlist').update({ title: '[team.full_playlist_for_edits_title]', description: '[team.full_playlist_for_edits_description]' }).eq('id', '[team.full_playlist_for_edits]')

learner:

- login
- openTo /learn/[team.lang_full]/playlists/[team.full_playlist_for_edits]
- up
- see playlist-detail-page
- click update-playlist-button
- up
- see edit-playlist-dialog
- typeInto edit-playlist-dialog title-input 'Test: Updated Playlist Title'
- click edit-playlist-dialog submit-button
- up
- seeToast toast-success
- seeText Test: Updated Playlist Title

// # learner adds phrase to playlist
//
// learner:
//
// - login
// - openTo /learn
// - see decks-list-grid
// - click [team.lang_full] deck-link
// - up
// - see deck-feed-page
// - click feed-item-playlist
// - up
// - see playlist-detail-page
// - up
// - click manage-phrases-button
// - see manage-phrases-dialog
// - click add-phrases-button
// - typeInto phrase-search-input 'test phrase'
// - click phrase-checkbox
// - click add-flashcard-button
// - up
// - seeToast toast-success

// # learner removes phrase from playlist
//
// learner:
//
// - login
// - openTo /learn
// - see decks-list-grid
// - click [team.lang_full] deck-link
// - up
// - see deck-feed-page
// - click feed-item-playlist
// - up
// - see playlist-detail-page
// - up
// - click manage-phrases-button
// - see manage-phrases-dialog
// - click remove-phrase-button
// - up
// - seeToast toast-success

// # learner reorders phrases in playlist
//
// learner:
//
// - login
// - openTo /learn
// - see decks-list-grid
// - click [team.lang_full] deck-link
// - up
// - see deck-feed-page
// - click feed-item-playlist
// - up
// - see playlist-detail-page
// - up
// - click manage-phrases-button
// - see manage-phrases-dialog
// - click move-phrase-down-button
