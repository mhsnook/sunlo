# learner navigates within a deck using sidebar

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn
- see decks-list-grid
- click decks-list-grid hin
- click sidebar-link--learn-lang-feed
- see deck-feed-page
- click sidebar-link--learn-lang-review
- see review-setup-page
- click sidebar-link--learn-lang-search
- see search-page
- click sidebar-link--learn-lang-contributions
- see contributions-page

# learner switches between decks

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn
- see decks-list-grid
- click decks-list-grid hin deck-link
- see deck-feed-page
- click back-to-decks-link
- see decks-list-grid
- click decks-list-grid tam deck-link
- see deck-feed-page

# learner accesses profile from user menu

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn
- see decks-list-grid
- click sidebar-user-menu-trigger
- click profile-menu-item
- see profile-page
- seeText 'Display Preferences'

# learner uses search functionality

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn
- see decks-list-grid
- click decks-list-grid hin deck-link
- click sidebar-link--learn-lang-search
- see search-page
- typeInto search-input hello
- see search-results

# learner adds a phrase to their deck

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn
- see decks-list-grid
- click decks-list-grid hin deck-link
- click feed-phrase-link
- see phrase-detail-page
- click card-status-dropdown
- seeText 'Not in deck'
- click add-to-deck-option
- seeToast toast-phrase-added

# learner changes card status through all states

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn
- see decks-list-grid
- click decks-list-grid hin deck-link
- click feed-phrase-link
- see phrase-detail-page
- click card-status-dropdown
- seeText Active
- click set-learned-option
- seeToast toast-status-updated
- click card-status-dropdown
- click ignore-card-option
- seeToast toast-status-updated
- click card-status-dropdown
- click activate-card-option
- seeToast toast-status-updated

# learner starts a review session

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn
- see decks-list-grid
- click decks-list-grid hin deck-link
- click sidebar-link--learn-lang-review
- see review-setup-page
- seeText 'Total cards'
- see start-review-button
- click start-review-button
- see review-session-page
- see flashcard

# learner completes a review session

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn/hin/review
- click start-review-button
- see review-session-page
- see flashcard
- click reveal-answer-button
- click rating-good-button
- see review-complete-page
