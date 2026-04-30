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
