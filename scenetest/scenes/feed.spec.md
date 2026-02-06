# learner views activity feed with requests playlists and phrases

learner:

- login
- openTo /learn
- see decks-list-grid
- click hin deck-link
- see deck-feed-page
- see feed-item-list
- see feed-item-request
- up
- see feed-item-list
- see feed-item-playlist
- up
- see feed-item-list
- see feed-item-phrase

# learner switches to popular tab on feed

learner:

- login
- openTo /learn
- see decks-list-grid
- click hin deck-link
- see deck-feed-page
- click feed-tab-popular
- see feed-item-list

# learner upvotes a playlist in feed

learner:

- login
- openTo /learn
- see decks-list-grid
- click hin deck-link
- see feed-item-playlist
- click upvote-playlist-button
- seeText 1
- click upvote-playlist-button
- seeText 0

# feed loads more items on scroll

learner:

- login
- openTo /learn
- see decks-list-grid
- click hin deck-link
- see deck-feed-page
- see feed-item-list
- scrollToBottom
- see load-more-button
- click load-more-button

# learner views chat messages from a friend

learner:

- login
- openTo /learn
- see decks-list-grid
- up
- click sidebar-link--friends-chats
- see chats-page
- see friend-chat-list
- click friend-chat-link
- up
- see chat-messages-container
- see chat-message-bubble

# opening a chat marks messages as read

learner:

- login
- openTo /learn
- see decks-list-grid
- click sidebar-link--friends-chats
- see chats-page
- see unread-badge
- click friend-chat-link
- see chat-messages-container
