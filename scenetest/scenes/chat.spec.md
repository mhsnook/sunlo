# visitor opens the chat prototype and sees the empty state

visitor:

- openTo /chat
- see chat-page
- see chat-language-picker
- see chat-empty-state
- see chat-input
- see chat-cart-button
- notSee chat-cart-badge
- notSee chat-selection-bar

# visitor sends a query and gets three result cards

visitor:

- openTo /chat
- see chat-page
- typeInto chat-input what do I say if I am going to the store?
- click chat-send-button
- up
- see chat-result-list
- see chat-user-message
- seeText going to the store

# adding a result puts it in both the cart and the selection

visitor:

- openTo /chat
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

- openTo /chat
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

- openTo /chat
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

- openTo /chat
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

- openTo /chat
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

- openTo /chat
- typeInto chat-input store
- click chat-send-button
- up
- click chat-phrase-result mock-spa-001 chat-toggle-cart-button
- see chat-selection-chip
- click chat-selection-chip mock-spa-001 chat-selection-remove-button
- notSee chat-selection-bar
- see chat-cart-badge

# switching languages resets the conversation, cart, and selection

visitor:

- openTo /chat
- typeInto chat-input store
- click chat-send-button
- up
- click chat-phrase-result mock-spa-001 chat-toggle-cart-button
- click chat-language-picker hin chat-language-option
- notSee chat-result-list
- notSee chat-cart-badge
- notSee chat-selection-bar
- see chat-empty-state
