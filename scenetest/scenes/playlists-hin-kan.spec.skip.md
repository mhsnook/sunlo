# learner creates a new Hindi playlist

// BLOCKED: cleanup uses [testStart] which is not yet supported in scenetest v0.2.0
// See scenetest/SETUP_DIRECTIVE.md for feature request details

cleanup: supabase.from('phrase_playlist').delete().eq('uid', '[learner.key]').eq('title', 'Test: Hindi Slang')

learner:

- login
- openTo /learn/hin/playlists/new
- up
- see new-playlist-form
- typeInto playlist-title-input 'Test: Hindi Slang'
- typeInto playlist-description-input 'Informal Hindi phrases young people use'
- click attach-phrase-button
- up
- click phrase-checkbox
- click add-selected-phrases-button
- up
- click create-playlist-button
- up
- seeToast toast-success
- see playlist-detail-page

# learner creates a new Kannada playlist

cleanup: supabase.from('phrase_playlist').delete().eq('uid', '[learner.key]').eq('title', 'Test: Kannada Basics')

learner:

- login
- openTo /learn/kan/playlists/new
- up
- see new-playlist-form
- typeInto playlist-title-input 'Test: Kannada Basics'
- typeInto playlist-description-input 'Essential Kannada for getting started'
- click attach-phrase-button
- up
- click phrase-checkbox
- click add-selected-phrases-button
- up
- click create-playlist-button
- up
- seeToast toast-success
- see playlist-detail-page

# learner2 upvotes a Kannada playlist

// BLOCKED: Uses learner2 actor and upvote flow which may have issues
// with strict mode on playlist-item list

cleanup: supabase.from('phrase_playlist_upvote').delete().eq('uid', '[learner2.key]').eq('playlist_id', 'c3d4e5f6-3333-4444-5555-666666666666')

learner2:

- login
- openTo /learn/kan/playlists
- up
- see playlist-list
- click playlist-item c3d4e5f6-3333-4444-5555-666666666666
- up
- see playlist-detail-page
- click upvote-playlist-button
- up
- seeToast toast-success
