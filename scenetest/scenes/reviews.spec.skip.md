# learner completes stage 1 with mixed scores

// TODO: requires switch-devices utility (not yet merged in scenetest)

cleanup: supabase.from('user_card_review').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang]').eq('day_session', '[today]')
cleanup: supabase.from('user_deck_review_state').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang]').eq('day_session', '[today]')

learner:

- login
- openTo /learn
- see decks-list-grid
- click [team.lang] deck-link
- up
- click /learn/$lang/review
- up
- see review-setup-page
- click start-review-button
- up
- see review-session-page
- see flashcard
- up
- click reveal-answer-button
- click rating-good-button
- up
- click reveal-answer-button
- click rating-good-button
- up
- click reveal-answer-button
- click rating-again-button
- up
- click reveal-answer-button
- click rating-good-button
- up
- click reveal-answer-button
- click rating-again-button
- up
- click reveal-answer-button
- click rating-good-button
- up
- see review-complete-page
- seeText Step 3 of 3
- seeText Review cards (2)
- assertDB user_deck_review_state.stage < 5

# learner reviews "again" cards and DB stage stays correct across devices

// TODO: requires switch-devices utility (not yet merged in scenetest)
// This test verifies the fix for the bug where entering stage 4
// ("review again cards") caused stage 5 to be written to the DB
// immediately, making a second device show "Review Complete!"

cleanup: supabase.from('user_card_review').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang]').eq('day_session', '[today]')
cleanup: supabase.from('user_deck_review_state').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang]').eq('day_session', '[today]')

// Continues from the previous scene

learner:

- login
- openTo /learn
- see decks-list-grid
- click [team.lang] deck-link
- up
- click /learn/$lang/review
- up
- click continue-review-button
- up
- see review-complete-page
- seeText Review cards
- click review-again-button
- up
- assertDB user_deck_review_state.stage = 4

// Switch to a second device to verify server state
// learner-device-2:
// - login
// - openTo /learn/$lang/review
// - notSee review-complete-page
// - see continue-review-button
// - assertDB user_deck_review_state.stage = 4

// Back on device 1: complete the "again" cards
learner:

- see flashcard
- click reveal-answer-button
- click rating-good-button
- up
- click reveal-answer-button
- click rating-good-button
- up
- see review-complete-page
- seeText Review Complete!
- assertDB user_deck_review_state.stage = 5

// Switch to device 2 to verify completion
// learner-device-2:
// - openTo /learn/$lang/review
// - see review-complete-page
// - seeText Review Complete!
