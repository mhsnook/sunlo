# learner creates a new deck

cleanup: supabase.from('user_deck').delete().eq('uid', '[learner.key]').eq('lang', 'spa')

learner:

- login
- openTo /learn
- see deck-card-[team.lang]
- up
- click deck-switcher-button
- click new-deck-menu-item
- see add-deck-form
- click language-selector-button
- up
- typeInto language-search-input Spanish
- click language-options spa
- up
- click start-learning-button
- up
- seeToast toast-success
- see deck-feed-page

# learner updates daily review goal

cleanup: supabase.from('user_deck').update({ daily_review_goal: 15 }).eq('uid', '[learner.key]').eq('lang', 'kan')

learner:

- login
- go-to-deck
- go-to-deck-settings
- see review-goal-options
- click 10
- up
- click update-daily-goal-button
- up
- seeToast toast-success

# learner updates learning goal

cleanup: supabase.from('user_deck').update({ learning_goal: 'moving' }).eq('uid', '[learner.key]').eq('lang', 'kan')

learner:

- login
- go-to-deck
- go-to-deck-settings
- see learning-goal-options
- click family
- up
- click update-goal-button
- up
- seeToast toast-success

# learner archives and restores a deck

cleanup: supabase.from('user_deck').update({ archived: false }).eq('uid', '[learner.key]').eq('lang', 'kan')

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
- notSee deck-card-[team.lang]
- up
- click view-archived-decks-link
- up
- click deck-card-[team.lang] deck-link
- up
- go-to-deck-settings
- click restore-deck-button
- up
- see restore-confirmation-dialog
- click confirm-restore-button
- up
- seeToast toast-success
