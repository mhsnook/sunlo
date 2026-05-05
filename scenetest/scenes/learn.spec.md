# learner navigates within a deck using sidebar

cleanup: supabase.from('user_card_review').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang_full]')
cleanup: supabase.from('user_deck_review_state').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang_full]')

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

// go-to-deck opens lang_full; switch to lang_partial to verify both decks
// are clickable from the grid.

learner:

- login
- go-to-deck
- click /learn
- up
- see decks-list-grid
- click [team.lang_partial] deck-tile
- click deck-link
- up
- see deck-feed-page

# learner accesses profile from user menu

learner:

- login
- openTo /learn
- up
- click sidebar-user-menu-trigger
- up
- click user-menu-profile
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

cleanup: supabase.from('user_card').delete().eq('uid', '[learner.key]').eq('phrase_id', '[team.partial_nocard_phrase]')

learner:

- login
- openTo /learn/[team.lang_partial]/phrases/[team.partial_nocard_phrase]
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
- openTo /learn/[team.lang_partial]/phrases/[team.partial_phrase_with_card]
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
- up
- click bulk-add-link
- up
- see bulk-add-page

# learner starts a review session

cleanup: supabase.from('user_card_review').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang_full]')
cleanup: supabase.from('user_deck_review_state').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang_full]')
cleanup: supabase.from('user_card').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang_full]').gte('created_at', '[testStart]')

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
