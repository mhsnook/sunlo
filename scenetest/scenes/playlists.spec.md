# learner edits their playlist

learner:

- login
- openTo /learn
- see decks-list-grid
- click hin deck-link
- see deck-feed-page
- click feed-item-playlist
- see playlist-detail-page
- click update-playlist-button
- see edit-playlist-dialog
- typeInto playlist-title-input 'Updated Playlist Title'
- typeInto playlist-description-input 'New description'
- typeInto playlist-href-input https://youtube.com/watch?v=test
- click save-playlist-button
- seeToast toast-success

# learner deletes their playlist

learner:

- login
- openTo /learn
- see decks-list-grid
- click hin deck-link
- see deck-feed-page
- click feed-item-playlist
- see playlist-detail-page
- click delete-playlist-button
- see delete-playlist-dialog
- click confirm-delete-button
- seeToast toast-success
- see deck-feed-page

# non-owner cannot manage playlist

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn
- see decks-list-grid
- click decks-list-grid hin deck-link
- see deck-feed-page
- click other-user-playlist-item
- see playlist-detail-page
- notSee update-playlist-button
- notSee delete-playlist-button
- notSee manage-phrases-button

# learner adds phrase to playlist

learner:

- login
- openTo /learn
- see decks-list-grid
- click hin deck-link
- see deck-feed-page
- click feed-item-playlist
- see playlist-detail-page
- click manage-phrases-button
- see manage-phrases-dialog
- click add-phrases-button
- typeInto phrase-search-input 'test phrase'
- click phrase-checkbox
- click add-flashcard-button
- seeToast toast-success

# learner removes phrase from playlist

learner:

- login
- openTo /learn
- see decks-list-grid
- click hin deck-link
- see deck-feed-page
- click feed-item-playlist
- see playlist-detail-page
- click manage-phrases-button
- see manage-phrases-dialog
- click remove-phrase-button
- seeToast toast-success

# learner reorders phrases in playlist

learner:

- login
- openTo /learn
- see decks-list-grid
- click hin deck-link
- see deck-feed-page
- click feed-item-playlist
- see playlist-detail-page
- click manage-phrases-button
- see manage-phrases-dialog
- click move-phrase-down-button
