# learner browses full-lang playlists

learner:

- login
- openTo /learn/[team.lang_full]/playlists
- up
- see playlist-list
- see playlist-item [team.full_playlist_for_edits]

# learner browses partial-lang playlists

learner:

- login
- openTo /learn/[team.lang_partial]/playlists
- up
- see playlist-list
- see playlist-item [team.partial_featured_playlist]

# learner opens a partial-lang playlist and sees linked phrases

learner:

- login
- openTo /learn/[team.lang_partial]/playlists
- up
- click playlist-item [team.partial_featured_playlist]
- up
- see playlist-detail-page
- see playlist-phrase-list

# learner creates a new full-lang playlist

cleanup: supabase.from('phrase_playlist').delete().eq('uid', '[learner.key]').eq('title', 'Test: Full Lang Slang')

learner:

- login
- openTo /learn/[team.lang_full]/playlists/new
- up
- scope new-playlist-form
- typeInto title-input 'Test: Full Lang Slang'
- typeInto description-input 'Informal phrases young people use'
- pressKey Tab
- click open-phrase-picker
- up
- click phrase-picker-item [team.full_picker_phrase]
- up
- click submit-button
- up
- see toast-success
- see playlist-detail-page

# learner creates a new partial-lang playlist

cleanup: supabase.from('phrase_playlist').delete().eq('uid', '[learner.key]').eq('title', 'Test: Partial Lang Basics')

learner:

- login
- openTo /learn/[team.lang_partial]/playlists/new
- up
- scope new-playlist-form
- typeInto title-input 'Test: Partial Lang Basics'
- typeInto description-input 'Essential phrases for getting started'
- pressKey Tab
- click open-phrase-picker
- up
- click phrase-picker-item [team.partial_picker_phrase]
- up
- click submit-button
- up
- see toast-success
- see playlist-detail-page

# learner2 upvotes a partial-lang playlist

cleanup: supabase.from('phrase_playlist_upvote').delete().eq('uid', '[learner2.key]').eq('playlist_id', '[team.partial_featured_playlist]')

learner2:

- login
- openTo /learn/[team.lang_partial]/playlists
- up
- see playlist-list
- click playlist-item [team.partial_featured_playlist]
- up
- see playlist-detail-page
- click upvote-playlist-button
- up
- seeToast toast-success
