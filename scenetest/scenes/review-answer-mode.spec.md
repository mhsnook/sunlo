# learner switches to 2-button mode via deck settings

cleanup: supabase.from('user_deck').update({ review_answer_mode: null }).eq('uid', '[learner.key]').eq('lang', '[team.lang]')

learner:

- login
- openTo /learn/[team.lang]/deck-settings
- up
- see deck-settings-page
- see review-answer-mode-radio
- click review-answer-mode-2-buttons
- up
- click update-review-answer-mode-button
- up
- seeToast toast-success

# learner sees 4-button mode by default during review

cleanup: supabase.from('user_deck').update({ review_answer_mode: null }).eq('uid', '[learner.key]').eq('lang', '[team.lang]')
cleanup: supabase.from('user_card_review').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang]')
cleanup: supabase.from('user_deck_review_state').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang]')
cleanup: supabase.from('user_card').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang]').gte('created_at', '[testStart]')

learner:

- login
- openTo /learn/[team.lang]/review
- up
- see review-setup-page
- click start-review-button
- up
- see review-preview-page
- click start-review-from-preview-button
- up
- see flashcard
- prev
- click reveal-answer-button
- see rating-again-button
- prev
- see rating-hard-button
- prev
- see rating-good-button
- prev
- see rating-easy-button

# learner sees 2-button mode with Forgot/Correct labels

setup: supabase.from('user_deck').update({ review_answer_mode: '2-buttons' }).eq('uid', '[learner.key]').eq('lang', '[team.lang]')
cleanup: supabase.from('user_deck').update({ review_answer_mode: null }).eq('uid', '[learner.key]').eq('lang', '[team.lang]')
cleanup: supabase.from('user_card_review').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang]')
cleanup: supabase.from('user_deck_review_state').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang]')
cleanup: supabase.from('user_card').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang]').gte('created_at', '[testStart]')

learner:

- login
- openTo /learn/[team.lang]/review
- up
- see review-setup-page
- click start-review-button
- up
- see review-preview-page
- click start-review-from-preview-button
- up
- see flashcard
- prev
- click reveal-answer-button
- see rating-again-button
- prev
- see rating-good-button
- prev
- notSee rating-hard-button
- notSee rating-easy-button

# learner clears deck override and falls back to profile default

setup: supabase.from('user_deck').update({ review_answer_mode: '2-buttons' }).eq('uid', '[learner.key]').eq('lang', '[team.lang]')
cleanup: supabase.from('user_deck').update({ review_answer_mode: null }).eq('uid', '[learner.key]').eq('lang', '[team.lang]')

learner:

- login
- openTo /learn/[team.lang]/deck-settings
- up
- see deck-settings-page
- click clear-review-answer-mode-button
- up
- seeToast toast-success
