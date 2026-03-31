# learner sees 4-button mode by default during review

// Default review_answer_mode is '4-buttons' (profile default)

learner:

- login
- openTo /learn
- see decks-list-grid
- click deck-link
- up
- click /learn/$lang/review
- up
- see review-setup-page
- click start-review-button
- up
- see flashcard
- click reveal-answer-button
- see rating-again-button
- see rating-hard-button
- see rating-good-button
- see rating-easy-button

# learner switches to 2-button mode via deck settings

cleanup: supabase.from('user_deck').update({ review_answer_mode: null }).eq('uid', '[learner.key]').eq('lang', '[team.lang]')

learner:

- login
- openTo /learn
- click deck-link
- up
- click top-right-context-menu
- click deck-settings-menu-item
- up
- see deck-settings-page
- up
- click dismiss-deck-settings-intro
- see review-answer-mode-radio
- click review-answer-mode-2-buttons
- up
- click update-review-answer-mode-button
- up
- seeToast toast-success

# learner sees 2-button mode during review after deck override

// Continues from the previous scene — deck is set to 2-buttons

setup: supabase.from('user_deck').update({ review_answer_mode: '2-buttons' }).eq('uid', '[learner.key]').eq('lang', '[team.lang]')
cleanup: supabase.from('user_deck').update({ review_answer_mode: null }).eq('uid', '[learner.key]').eq('lang', '[team.lang]')

learner:

- login
- openTo /learn
- click deck-link
- up
- click /learn/$lang/review
- up
- see review-setup-page
- click start-review-button
- up
- see flashcard
- click reveal-answer-button
- see rating-again-button
- see rating-good-button
- notSee rating-hard-button
- notSee rating-easy-button

# learner reviews a card with 2-button "Forgot" (score 1)

setup: supabase.from('user_deck').update({ review_answer_mode: '2-buttons' }).eq('uid', '[learner.key]').eq('lang', '[team.lang]')
cleanup: supabase.from('user_deck').update({ review_answer_mode: null }).eq('uid', '[learner.key]').eq('lang', '[team.lang]')
cleanup: supabase.from('user_card_review').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang]').eq('day_session', '[today]')
cleanup: supabase.from('user_deck_review_state').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang]').eq('day_session', '[today]')

learner:

- login
- openTo /learn
- click deck-link
- up
- click /learn/$lang/review
- up
- click start-review-button
- up
- see flashcard
- click reveal-answer-button
- seeText Forgot
- seeText Correct!
- click rating-again-button
- up
- see flashcard

# learner reviews a card with 2-button "Correct!" (score 3)

setup: supabase.from('user_deck').update({ review_answer_mode: '2-buttons' }).eq('uid', '[learner.key]').eq('lang', '[team.lang]')
cleanup: supabase.from('user_deck').update({ review_answer_mode: null }).eq('uid', '[learner.key]').eq('lang', '[team.lang]')
cleanup: supabase.from('user_card_review').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang]').eq('day_session', '[today]')
cleanup: supabase.from('user_deck_review_state').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang]').eq('day_session', '[today]')

learner:

- login
- openTo /learn
- click deck-link
- up
- click /learn/$lang/review
- up
- click start-review-button
- up
- see flashcard
- click reveal-answer-button
- click rating-good-button
- up
- see flashcard

# learner clears deck override and falls back to profile default

setup: supabase.from('user_deck').update({ review_answer_mode: '2-buttons' }).eq('uid', '[learner.key]').eq('lang', '[team.lang]')
cleanup: supabase.from('user_deck').update({ review_answer_mode: null }).eq('uid', '[learner.key]').eq('lang', '[team.lang]')

learner:

- login
- openTo /learn
- click deck-link
- up
- click top-right-context-menu
- click deck-settings-menu-item
- up
- see deck-settings-page
- up
- click dismiss-deck-settings-intro
- seeText Overriding the profile default
- click clear-review-answer-mode-button
- up
- seeToast toast-success
- seeText Currently using profile default
