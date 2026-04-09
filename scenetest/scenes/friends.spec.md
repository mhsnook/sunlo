# learner views friends list

learner:

- login
- openTo /learn
- see decks-list-grid
- up
- click /friends
- up
- see friends-section

# learner opens friend search dialog from appnav

learner:

- login
- openTo /friends
- see friends-section
- click appnav-search-button
- see friend-search-overlay
- see friend-search-input

# learner searches for a friend by username

learner:

- login
- openTo /friends
- see friends-section
- click appnav-search-button
- see friend-search-overlay
- typeInto friend-search-input Lex
- see friend-search-results

# learner closes friend search dialog

learner:

- login
- openTo /friends
- see friends-section
- click appnav-search-button
- see friend-search-overlay
- click close-dialog-button
- notSee friend-search-overlay
- see friends-section

# learner opens friend search via search param

learner:

- login
- openTo /friends?search=true
- see friend-search-overlay
- see friend-search-input

# learner navigates to friend requests tab

learner:

- login
- openTo /friends
- see friends-section
- up
- click appnav-requests
- up
- see friend-requests-page

# learner navigates to chats from friends

learner:

- login
- openTo /friends
- see friends-section
- up
- click appnav-chats
- up
- see chats-page
