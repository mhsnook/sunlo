# learner edits their playlist

// Ported from the retired e2e spec `playlists.spec.ts` ("update playlist: edit
// title, description, and href"). A YouTube source URL renders as an embed, so
// `playlist-embed` is the user-visible proof that the URL was saved.
// The manage-phrases flows that lived in the same e2e file — add, remove,
// reorder, and the per-phrase timestamp link — are covered by
// playlist-mutations.spec.ts, which asserts the persisted rows.

cleanup: supabase.from('phrase_playlist').update({ title: '[team.full_playlist_for_edits_title]', description: '[team.full_playlist_for_edits_description]', href: null }).eq('id', '[team.full_playlist_for_edits]')

learner:

- login
- openTo /learn/[team.lang_full]/playlists/[team.full_playlist_for_edits]
- up
- see playlist-detail-page
- notSee playlist-embed
- click update-playlist-button
- up
- see edit-playlist-dialog
- typeInto edit-playlist-dialog title-input 'Test: Updated Playlist Title'
- typeInto edit-playlist-dialog description-input 'Test: updated playlist description'
- typeInto edit-playlist-dialog href-input 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
- click edit-playlist-dialog submit-button
- up
- seeToast toast-success
- notSee edit-playlist-dialog
- seeText Test: Updated Playlist Title
- seeText Test: updated playlist description
- see playlist-embed
