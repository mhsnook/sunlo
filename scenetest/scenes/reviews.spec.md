# learner completes stage 1 with mixed scores

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
