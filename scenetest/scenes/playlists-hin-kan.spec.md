# learner browses Hindi playlists

learner:

- login
- openTo /learn/hin/playlists
- up
- see playlist-list
- seeText Essential Hindi Greetings
- seeText Hindi Numbers and Counting
- seeText Hindi Expressions & Feelings
- seeText Hindi Daily Conversations

# learner browses Kannada playlists

learner:

- login
- openTo /learn/kan/playlists
- up
- see playlist-list
- seeText Basic Kannada Phrases
- seeText Kannada Survival Kit
- seeText Kannada at the Market
- seeText Kannada Food & Dining

# learner opens a Kannada playlist and sees linked phrases

learner:

- login
- openTo /learn/kan/playlists
- up
- click playlist-item
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
- click create-playlist-button
- up
- seeToast toast-success
- see playlist-detail-page

# learner2 upvotes a Kannada playlist

cleanup: supabase.from('phrase_playlist_upvote').delete().eq('uid', '[learner2.key]').eq('playlist_id', 'aa220001-1111-4aaa-bbbb-dddddddddddd')

learner2:

- login
- openTo /learn/kan/playlists
- up
- see playlist-list
- click playlist-item
- up
- see playlist-detail-page
- click upvote-playlist-button
- up
- seeToast toast-success
