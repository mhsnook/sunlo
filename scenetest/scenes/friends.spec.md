# learner opens friend search dialog from chats

learner:

- login
- openTo /friends/chats
- see chats-page
- click appnav-search-button
- see friend-search-overlay
- see friend-search-input

# learner searches for a friend by username

learner:

- login
- openTo /friends/chats
- see chats-page
- click appnav-search-button
- see friend-search-overlay
- typeInto friend-search-input Lex
- see friend-search-results

# learner closes friend search dialog

learner:

- login
- openTo /friends/chats
- see chats-page
- click appnav-search-button
- see friend-search-overlay
- click close-dialog-button
- notSee friend-search-overlay
- see chats-page

# learner opens friend search via search param

learner:

- login
- openTo /friends/chats?search=true
- see friend-search-overlay
- see friend-search-input

# friends index redirects to chats

learner:

- login
- openTo /friends
- see chats-page
