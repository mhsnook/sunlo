# learner switches to 2-button mode via deck settings

cleanup: supabase.from('user_deck').update({ review_answer_mode: null }).eq('uid', '[learner.key]').eq('lang', 'kan')

learner:

- login
- openTo /learn/kan/deck-settings
- up
- see deck-settings-page
- see review-answer-mode-radio
- click review-answer-mode-2-buttons
- up
- click update-review-answer-mode-button
- up
- seeToast toast-success

// Note: The "learner sees 4-button mode by default during review" scene
// requires a working review session (cards loaded, mutation creating the
// session, navigation to /review/go). This is covered in the review
// e2e tests. Scenes testing 2-button review flow and clearing deck
// override require `setup:` directives — see review-answer-mode.spec.skip.md.
