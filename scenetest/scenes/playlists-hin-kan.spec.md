# learner browses Hindi playlists

learner:

- login
- openTo /learn/hin/playlists
- up
- see playlist-list
- seeText Essential Hindi Greetings
- seeText Hindi Questions
- seeText Hindi Numbers and Counting
- seeText Hindi Travel Phrases

# learner browses Kannada playlists

learner:

- login
- openTo /learn/kan/playlists
- up
- see playlist-list
- seeText Basic Kannada Phrases
- seeText Kannada Food & Dining

# learner opens a Kannada playlist and sees linked phrases

learner:

- login
- openTo /learn/kan/playlists
- up
- click playlist-item c3d4e5f6-3333-4444-a555-666666666666
- up
- see playlist-detail-page
- see playlist-phrase-list

# learner creates a new Hindi playlist

cleanup: supabase.from('phrase_playlist').delete().eq('uid', '[learner.key]').eq('title', 'Test: Hindi Slang')

learner:

- login
- openTo /learn/hin/playlists/new
- up
- see new-playlist-form
- typeInto playlist-title-input 'Test: Hindi Slang'
- typeInto playlist-description-input 'Informal Hindi phrases young people use'
- pressKey Tab
- click open-phrase-picker
- up
- click phrase-picker-item 2fbae84f-5b1d-43c2-8927-ef4d41c7e794
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
- pressKey Tab
- click open-phrase-picker
- up
- click phrase-picker-item b9e3edac-de8b-4796-b436-a0cded08d2ae
- up
- click create-playlist-button
- up
- seeToast toast-success
- see playlist-detail-page

# learner2 upvotes a Kannada playlist

cleanup: supabase.from('phrase_playlist_upvote').delete().eq('uid', '[learner2.key]').eq('playlist_id', 'c3d4e5f6-3333-4444-a555-666666666666')

learner2:

- login
- openTo /learn/kan/playlists
- up
- see playlist-list
- click playlist-item c3d4e5f6-3333-4444-a555-666666666666
- up
- see playlist-detail-page
- click upvote-playlist-button
- up
- seeToast toast-success
