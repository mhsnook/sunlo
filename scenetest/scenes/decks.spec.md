# learner creates a new deck

cleanup: supabase.from('user_deck').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang_empty]')

learner:

- login
- openTo /learn
- see deck-tile-[team.lang_full]
- up
- click deck-switcher-button
- click new-deck-menu-item
- see add-deck-form
- click language-selector-button
- up
- typeInto language-search-input [team.lang_empty_name]
- click language-options [team.lang_empty]
- up
- click confirm-language-button
- up
- seeToast toast-success
- see deck-feed-page

# learner updates daily review goal

cleanup: supabase.from('user_deck').update({ daily_review_goal: 15 }).eq('uid', '[learner.key]').eq('lang', '[team.lang_full]')

learner:

- login
- go-to-deck
- go-to-deck-settings
- see review-goal-options
- click 10
- up
- seeToast toast-success

# learner updates learning goal

cleanup: supabase.from('user_deck').update({ learning_goal: 'moving' }).eq('uid', '[learner.key]').eq('lang', '[team.lang_full]')

learner:

- login
- go-to-deck
- go-to-deck-settings
- see learning-goal-options
- click family
- up
- seeToast toast-success

# learner archives and restores a deck

cleanup: supabase.from('user_deck').update({ archived: false }).eq('uid', '[learner.key]').eq('lang', '[team.lang_full]')

learner:

- login
- go-to-deck
- go-to-deck-settings
- click archive-deck-button
- up
- see archive-confirmation-dialog
- click confirm-archive-button
- up
- seeToast toast-success
- up
- openTo /learn
- see decks-list-grid
- notSee deck-tile-[team.lang_full]
- up
- click view-archived-decks-link
- up
- click [team.lang_full] archived-deck-tile
- up
- click confirm-restore-button
- up
- seeToast toast-success
