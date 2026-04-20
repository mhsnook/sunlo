# learner navigates within a deck using sidebar

cleanup: supabase.from('user_card_review').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang]')
cleanup: supabase.from('user_deck_review_state').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang]')

learner:

- login
- go-to-deck
- click /learn/$lang/feed
- up
- see deck-feed-page
- up
- click /learn/$lang/review
- up
- ifClick review-intro-dismiss
- see review-setup-page
- up
- click /learn/$lang/contributions
- up
- see contributions-page

# learner switches between decks

learner:

- login
- go-to-deck
- click /learn
- up
- see decks-list-grid
- click tam deck-link
- up
- see deck-feed-page

# learner accesses profile from user menu

learner:

- login
- openTo /learn
- up
- click sidebar-user-menu-trigger
- click /profile
- up
- see profile-page
- seeText Display Preferences

# learner uses search functionality

learner:

- login
- go-to-deck
- click navbar-search-button
- up
- scope browse-search-overlay
- typeInto browse-search-input tea
- see browse-search-results

# learner adds a phrase to their deck

cleanup: supabase.from('user_card').delete().eq('uid', '[learner.key]').eq('phrase_id', '[team.nocard_phrase]')

learner:

- login
- openTo /learn/[team.lang]/phrases/[team.nocard_phrase]
- up
- see phrase-detail-page
- seeText Not in deck
- up
- click card-status-dropdown
- click add-to-deck-option
- up
- seeToast toast-success

# learner changes card status through all states

learner:

- login
- openTo /learn/[team.lang]/phrases/aa110006-6666-4aaa-bbbb-cccccccccccc
- up
- see phrase-detail-page
- up
- click card-status-dropdown
- seeText Active
- prev
- click set-learned-option
- up
- seeToast toast-success
- click card-status-dropdown
- click ignore-card-option
- up
- seeToast toast-success
- click card-status-dropdown
- click activate-card-option
- up
- seeToast toast-success

# learner opens add-phrase page from deck context menu

learner:

- login
- go-to-deck
- click top-right-context-menu
- click phrases-new-menu-item
- up
- see add-phrase-page

# learner navigates from add-phrase to bulk-add

learner:

- login
- go-to-deck
- click top-right-context-menu
- click phrases-new-menu-item
- up
- see add-phrase-page
- click bulk-add-link
- up
- see bulk-add-page

# learner starts a review session

cleanup: supabase.from('user_card_review').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang]')
cleanup: supabase.from('user_deck_review_state').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang]')
cleanup: supabase.from('user_card').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang]').gte('created_at', '[testStart]')

learner:

- login
- go-to-deck
- click /learn/$lang/review
- up
- ifClick review-intro-dismiss
- see review-setup-page
- up
- see start-review-button
- up
- click start-review-button
- up
- see review-preview-page
- click start-review-from-preview-button
- up
- see review-session-page
- see flashcard
