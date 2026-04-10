# learner starts a review session with bidirectional cards

// Tests that the review flow works with both forward and reverse cards.
// Inline assertions (useCheck) verify:
// - manifest ordering: forward cards come before reverse cards
// - only_reverse phrases only appear as reverse cards

cleanup: supabase.from('user_card_review').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang]')
cleanup: supabase.from('user_deck_review_state').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang]')
cleanup: supabase.from('user_card').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang]').gte('created_at', '[testStart]')

learner:

- login-and-go-to-deck
- click /learn/$lang/review
- up
- see review-setup-page
- click start-review-button
- up
- see review-preview-page
- click start-review-from-preview-button
- up
- see review-session-page
- see flashcard

// Review the first card — score it Good

- click reveal-answer-button
- click rating-good-button
- up

// Review the second card — score it Again

- see flashcard
- click reveal-answer-button
- click rating-again-button
- up

// Review the third card — score it Good

- see flashcard
- click reveal-answer-button
- click rating-good-button
- up
