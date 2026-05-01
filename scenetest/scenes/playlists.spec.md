# learner edits their playlist

cleanup: supabase.from('phrase_playlist').update({ title: 'Essential Hindi Greetings', description: 'Common greetings and polite phrases for everyday conversations in Hindi' }).eq('id', 'a1b2c3d4-1111-4222-a333-444444444444')

learner:

- login
- openTo /learn/hin/playlists/a1b2c3d4-1111-4222-a333-444444444444
- up
- see playlist-detail-page
- click update-playlist-button
- up
- see edit-playlist-dialog
- typeInto edit-playlist-dialog title-input 'Updated Hindi Greetings'
- click edit-playlist-dialog submit-button
- up
- seeToast toast-success
- seeText Updated Hindi Greetings

// # learner deletes their playlist
//
// learner:
//
// - login
// - openTo /learn
// - see decks-list-grid
// - click [team.lang] deck-link
// - up
// - see deck-feed-page
// - click feed-item-playlist
// - up
// - see playlist-detail-page
// - up
// - click delete-playlist-button
// - see delete-playlist-dialog
// - click confirm-delete-button
// - up
// - seeToast toast-success
// - up
// - see deck-feed-page

// # non-owner cannot manage playlist
//
// learner:
//
// - openTo /login
// - typeInto email-input [self.email]
// - typeInto password-input [self.password]
// - click submit-button
// - openTo /learn
// - see decks-list-grid
// - click [team.lang] deck-link
// - see deck-feed-page
// - click other-user-playlist-item
// - see playlist-detail-page
// - notSee update-playlist-button
// - notSee delete-playlist-button
// - notSee manage-phrases-button

// # learner adds phrase to playlist
//
// learner:
//
// - login
// - openTo /learn
// - see decks-list-grid
// - click [team.lang] deck-link
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
// - click [team.lang] deck-link
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
// - click [team.lang] deck-link
// - up
// - see deck-feed-page
// - click feed-item-playlist
// - up
// - see playlist-detail-page
// - up
// - click manage-phrases-button
// - see manage-phrases-dialog
// - click move-phrase-down-button
