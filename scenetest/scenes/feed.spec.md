# learner views activity feed with requests playlists and phrases

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn
- see decks-list-grid
- click decks-list-grid hin deck-link
- see deck-feed-page
- see feed-item-list
- see feed-item-request
- see feed-item-playlist
- see feed-item-phrase

# learner switches to popular tab on feed

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn
- see decks-list-grid
- click decks-list-grid hin deck-link
- see deck-feed-page
- click feed-tab-popular
- see feed-item-list

# learner upvotes a playlist in feed

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn
- see decks-list-grid
- click decks-list-grid hin deck-link
- see feed-item-playlist
- click upvote-playlist-button
- seeText 1
- click upvote-playlist-button
- seeText 0

# feed loads more items on scroll

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn
- see decks-list-grid
- click decks-list-grid hin deck-link
- see deck-feed-page
- see feed-item-list
- scrollToBottom
- see load-more-button
- click load-more-button

# learner views chat messages from a friend

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn
- see decks-list-grid
- click sidebar-link--friends-chats
- see chats-page
- see friend-chat-list
- click friend-chat-link
- see chat-messages-container
- see chat-message-bubble

# opening a chat marks messages as read

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn
- see decks-list-grid
- click sidebar-link--friends-chats
- see chats-page
- see unread-badge
- click friend-chat-link
- see chat-messages-container
