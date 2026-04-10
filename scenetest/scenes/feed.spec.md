# learner views activity feed with requests and playlists

learner:

- login-and-go-to-deck
- up
- see feed-item-list
- see feed-item-playlist c3d4e5f6-3333-4444-a555-666666666666

# learner switches to popular tab on feed

learner:

- login-and-go-to-deck
- up
- click feed-tab-popular
- see feed-item-list

# learner upvotes a playlist in feed

cleanup: supabase.from('phrase_playlist_upvote').delete().eq('uid', '[learner.key]').eq('playlist_id', 'c3d4e5f6-3333-4444-a555-666666666666')

learner:

- login-and-go-to-deck
- see feed-item-playlist c3d4e5f6-3333-4444-a555-666666666666
- click upvote-playlist-button
- up
- see feed-item-playlist c3d4e5f6-3333-4444-a555-666666666666
- click upvote-playlist-button

# feed loads more items on scroll

// learner:
//
// - login-and-go-to-deck
// - see feed-item-list
// - up
// - scrollToBottom
// - see load-more-button
// - click load-more-button

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
- click friend-chat-link 7ad846a9-d55b-4035-8be2-dbcc70074f74
- up
- see chat-messages-container
- seeText Sent a phrase recommendation.

// # opening a chat marks messages as read
//
// learner:
//
// - login
// - openTo /learn
// - see decks-list-grid
// - up
// - click /friends/chats
// - up
// - see chats-page
// - see unread-badge
// - up
// - click friend-chat-link
// - up
// - see chat-messages-container
