# learner views activity feed with requests and playlists

learner:

- login
- openTo /learn
- see decks-list-grid
- click [team.lang] deck-link
- up
- see deck-feed-page
- see feed-item-list
- see feed-item-request
- up
- see feed-item-list
- see feed-item-playlist

# learner switches to popular tab on feed

learner:

- login
- openTo /learn
- see decks-list-grid
- click [team.lang] deck-link
- up
- see deck-feed-page
- up
- click feed-tab-popular
- see feed-item-list

# learner upvotes a playlist in feed

learner:

- login
- openTo /learn
- see decks-list-grid
- click [team.lang] deck-link
- up
- see feed-item-playlist
- click upvote-playlist-button
- up
- see feed-item-playlist
- click upvote-playlist-button

# feed loads more items on scroll

// learner:
//
// - login
// - openTo /learn
// - see decks-list-grid
// - click [team.lang] deck-link
// - up
// - see deck-feed-page
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
- click friend-chat-link
- up
- see chat-messages-container
- see chat-message-bubble

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
