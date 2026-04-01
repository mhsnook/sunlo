# learner sees 4-button mode by default during review

// BLOCKED: Requires a working review session with cards loaded.
// The review intro dialog must be dismissed first, and the session
// mutation must succeed with available cards.

learner:

- login
- openTo /learn/kan/review
- up
- click dismiss-review-intro
- up
- click start-review-button
- up
- see flashcard
- click reveal-answer-button
- see rating-again-button
- see rating-hard-button
- see rating-good-button
- see rating-easy-button

# learner sees 2-button mode with Forgot/Correct labels

// BLOCKED: Requires `setup:` directive to pre-set review_answer_mode to '2-buttons'
// See scenetest/SETUP_DIRECTIVE.md for feature request details

setup: supabase.from('user_deck').update({ review_answer_mode: '2-buttons' }).eq('uid', '[learner.key]').eq('lang', 'kan')
cleanup: supabase.from('user_deck').update({ review_answer_mode: null }).eq('uid', '[learner.key]').eq('lang', 'kan')

learner:

- login
- openTo /learn/kan/review
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

# learner clears deck override and falls back to profile default

// BLOCKED: Requires `setup:` directive to pre-set a deck override so it can be cleared

setup: supabase.from('user_deck').update({ review_answer_mode: '2-buttons' }).eq('uid', '[learner.key]').eq('lang', 'kan')
cleanup: supabase.from('user_deck').update({ review_answer_mode: null }).eq('uid', '[learner.key]').eq('lang', 'kan')

learner:

- login
- openTo /learn/kan/deck-settings
- up
- see deck-settings-page
- click clear-review-answer-mode-button
- up
- seeToast toast-success
