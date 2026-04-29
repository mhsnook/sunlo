# visitor lands on the chats index and picks a language

visitor:

- openTo /chats
- see chats-index-page
- see chats-language-list
- click chats-language-list spa chats-language-link
- up
- see chat-page
- see chat-empty-state
- see chat-input
- see chat-cart-button
- notSee chat-cart-badge
- notSee chat-selection-bar

# visitor sends a query and gets three result cards

visitor:

- openTo /chats/spa
- see chat-page
- typeInto chat-input what do I say if I am going to the store?
- click chat-send-button
- up
- see chat-result-list
- see chat-user-message
- seeText going to the store

# adding a result puts it in both the cart and the selection

visitor:

- openTo /chats/spa
- typeInto chat-input store
- click chat-send-button
- up
- see chat-result-list
- click chat-phrase-result mock-spa-001 chat-toggle-cart-button
- see chat-cart-badge
- see chat-selection-bar
- see chat-selection-chip

# pivoting consumes the selection but leaves the cart intact

visitor:

- openTo /chats/spa
- typeInto chat-input store
- click chat-send-button
- up
- click chat-phrase-result mock-spa-001 chat-toggle-cart-button
- click chat-phrase-result mock-spa-002 chat-toggle-cart-button
- see chat-selection-bar
- click chat-pivot-button
- up
- seeText More like
- notSee chat-selection-bar
- see chat-cart-badge

# adding more phrases after a pivot only puts the new ones into the next selection

visitor:

- openTo /chats/spa
- typeInto chat-input store
- click chat-send-button
- up
- click chat-phrase-result mock-spa-001 chat-toggle-cart-button
- click chat-pivot-button
- up
- click chat-phrase-result mock-spa-004 chat-toggle-cart-button
- see chat-selection-bar
- see chat-selection-chip
- notSee chat-selection-chip mock-spa-001

# opening the cart popover shows everything ever added

visitor:

- openTo /chats/spa
- typeInto chat-input store
- click chat-send-button
- up
- click chat-phrase-result mock-spa-001 chat-toggle-cart-button
- click chat-pivot-button
- up
- click chat-phrase-result mock-spa-004 chat-toggle-cart-button
- click chat-cart-button
- see chat-cart-popover
- see chat-cart-popover mock-spa-001 chat-cart-item
- see chat-cart-popover mock-spa-004 chat-cart-item

# removing from cart also clears selection if present

visitor:

- openTo /chats/spa
- typeInto chat-input store
- click chat-send-button
- up
- click chat-phrase-result mock-spa-001 chat-toggle-cart-button
- see chat-selection-chip
- click chat-cart-button
- click chat-cart-popover mock-spa-001 chat-cart-remove-button
- notSee chat-selection-bar
- notSee chat-cart-badge

# removing from selection leaves the cart untouched

visitor:

- openTo /chats/spa
- typeInto chat-input store
- click chat-send-button
- up
- click chat-phrase-result mock-spa-001 chat-toggle-cart-button
- see chat-selection-chip
- click chat-selection-chip mock-spa-001 chat-selection-remove-button
- notSee chat-selection-bar
- see chat-cart-badge

# each language keeps its own conversation

visitor:

- openTo /chats/spa
- typeInto chat-input store
- click chat-send-button
- up
- see chat-result-list
- click chat-phrase-result mock-spa-001 chat-toggle-cart-button
- see chat-cart-badge
- click chat-back-link
- up
- click chats-language-list hin chats-language-link
- up
- see chat-empty-state
- notSee chat-cart-badge
- click chat-back-link
- up
- click chats-language-list spa chats-language-link
- up
- see chat-result-list
- see chat-cart-badge
