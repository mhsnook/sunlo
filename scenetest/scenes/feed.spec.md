# learner views activity feed with requests and playlists

learner:

- login
- go-to-deck
- see feed-item-list
- see feed-item-playlist [team.full_playlist_for_edits]

# learner switches to popular tab on feed

learner:

- login
- go-to-deck
- click feed-tab-popular
- see feed-item-list

# learner upvotes a playlist in feed

cleanup: supabase.from('phrase_playlist_upvote').delete().eq('uid', '[learner.key]').eq('playlist_id', '[team.full_playlist_for_edits]')

learner:

- login
- go-to-deck
- see feed-item-playlist [team.full_playlist_for_edits]
- up
- click feed-item-playlist [team.full_playlist_for_edits] upvote-playlist-button
- up
- see feed-item-playlist [team.full_playlist_for_edits]
- up
- click feed-item-playlist [team.full_playlist_for_edits] upvote-playlist-button

// feed loads more items on scroll — SKIPPED: even the well-populated lang
// has <20 feed items so hasNextPage is false and load-more-button never
// renders. Re-enable after adding more feed seed data.

# learner views chat messages from a friend

learner:

- login
- openTo /learn
- see decks-list-grid
- up
- click /friends/chats
- up
- see chats-page
- see friend-chat-list
- click friend-chat-link [friend.key]
- up
- see chat-messages-container
- seeText Sent a phrase recommendation.

# opening a chat marks messages as read

learner:

- login
- openTo /learn
- see decks-list-grid
- up
- click /friends/chats
- up
- see chats-page
- see unread-badge
- up
- click friend-chat-link [learner2.key]
- up
- see chat-messages-container

learner2:
