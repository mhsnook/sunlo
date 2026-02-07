// # learner navigates within a deck using sidebar
//
// learner:
//
// - login
// - openTo /learn
// - see decks-list-grid
// - click [team.lang] deck-link
// - up
// - click /learn/$lang/feed
// - up
// - see deck-feed-page
// - up
// - click /learn/$lang/review
// - up
// - see review-intro
// - click review-intro-dismiss
// - see review-setup-page
// - up
// - click /learn/$lang/search
// - up
// - see search-page
// - up
// - click /learn/$lang/contributions
// - up
// - see contributions-page

# learner switches between decks

learner:

- login
- openTo /learn
- see decks-list-grid
- click [team.lang] deck-link
- up
- see deck-feed-page
- up
- click /learn
- up
- see decks-list-grid
- click tam deck-link
- up
- see deck-feed-page

// # learner accesses profile from user menu
//
// learner:
//
// - login
// - openTo /learn
// - see decks-list-grid
// - up
// - click sidebar-user-menu-trigger
// - click /profile
// - up
// - see profile-page
// - seeText Display Preferences

# learner uses search functionality

learner:

- login
- openTo /learn
- see decks-list-grid
- click [team.lang] deck-link
- up
- click /learn/$lang/search
- up
- see search-page
- typeInto search-input tea
- see search-results

# learner adds a phrase to their deck

// learner:
//
// - login
// - openTo /learn
// - see decks-list-grid
// - click [team.lang] deck-link
// - up
// - click feed-phrase-link
// - up
// - see phrase-detail-page
// - up
// - click card-status-dropdown
// - seeText Not in deck
// - click add-to-deck-option
// - up
// - seeToast toast-success

# learner changes card status through all states

// learner:
//
// - login
// - openTo /learn
// - see decks-list-grid
// - click [team.lang] deck-link
// - up
// - click feed-phrase-link
// - up
// - see phrase-detail-page
// - up
// - click card-status-dropdown
// - seeText Active
// - click set-learned-option
// - up
// - seeToast toast-success
// - click card-status-dropdown
// - click ignore-card-option
// - up
// - seeToast toast-success
// - click card-status-dropdown
// - click activate-card-option
// - up
// - seeToast toast-success

// # learner starts a review session
//
// learner:
//
// - login
// - openTo /learn
// - see decks-list-grid
// - click [team.lang] deck-link
// - up
// - click /learn/$lang/review
// - up
// - see review-intro
// - click review-intro-dismiss
// - see review-setup-page
// - seeText Total cards
// - up
// - see start-review-button
// - click start-review-button
// - up
// - see review-session-page
// - see flashcard

// # learner completes a review session
//
// learner:
//
// - login
// - openTo /learn/[team.lang]/review
// - see review-intro
// - click review-intro-dismiss
// - see review-setup-page
// - up
// - click start-review-button
// - up
// - see review-session-page
// - see flashcard
// - up
// - click reveal-answer-button
// - click rating-good-button
// - up
// - see review-complete-page
