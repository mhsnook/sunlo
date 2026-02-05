# learner creates a new deck

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn
- see decks-list-grid
- click deck-switcher-button
- click new-deck-menu-item
- see add-deck-form
- click language-selector-button
- typeInto language-search-input Spanish
- click language-options spa
- click start-learning-button
- seeToast toast-deck-created
- see deck-feed-page

# learner updates daily review goal

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn
- see decks-list-grid
- click decks-list-grid hin
- click top-right-context-menu
- click deck-settings-menu-item
- see deck-settings-page
- click review-goal-options 10
- click update-daily-goal-button
- seeToast toast-settings-updated

# learner updates learning goal

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn
- see decks-list-grid
- click decks-list-grid hin
- click top-right-context-menu
- click deck-settings-menu-item
- see deck-settings-page
- click learning-goal-options family
- click update-goal-button
- seeToast toast-settings-updated

# learner archives and restores a deck

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn
- see decks-list-grid
- click decks-list-grid spa
- click top-right-context-menu
- click deck-settings-menu-item
- click archive-deck-button
- see archive-confirmation-dialog
- click confirm-archive-button
- seeToast toast-deck-archived
- click back-to-all-decks-link
- notSee decks-list-grid spa
- click view-archived-decks-link
- see decks-list-grid spa
- click decks-list-grid spa deck-link
- click top-right-context-menu
- click deck-settings-menu-item
- click restore-deck-button
- see restore-confirmation-dialog
- click confirm-restore-button
- seeToast toast-deck-restored
