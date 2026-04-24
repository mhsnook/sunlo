// Issue #202 - "Error creating phrase from request from chat"
//
// learner2 shared the seeded Hindi request (e0d3a74e...) with learner in chat.
// The learner taps the request preview bubble, opens the flashcard search
// dialog from the request page, then creates a brand-new phrase inline. The
// bug historically surfaced at the final submit; these scenes fail if the
// create mutation toasts an error instead of success.

# learner creates a phrase from a request shared in chat

cleanup: supabase.from('comment_phrase_link').delete().eq('uid', '[learner.key]').eq('request_id', 'e0d3a74e-4fe7-43c0-aa35-d05c83929986')
cleanup: supabase.from('request_comment').delete().eq('uid', '[learner.key]').eq('request_id', 'e0d3a74e-4fe7-43c0-aa35-d05c83929986').gte('created_at', '[testStart]')
cleanup: supabase.from('user_card').delete().eq('uid', '[learner.key]').eq('lang', 'hin').gte('created_at', '[testStart]')
cleanup: supabase.from('phrase_translation').delete().eq('added_by', '[learner.key]').eq('text', 'Kitne baj rahe hain?')
cleanup: supabase.from('phrase').delete().eq('added_by', '[learner.key]').eq('text', 'What time is it?')

learner:

- login
- openTo /friends/chats/[learner2.key]
- see chat-messages-container
- click chat-request-preview e0d3a74e-4fe7-43c0-aa35-d05c83929986
- up
- see request-detail-page
- click open-flashcard-search
- up
- see comment-dialog
- click create-new-phrase-button
- up
- see inline-phrase-creator
- typeInto inline-phrase-text-input 'What time is it?'
- typeInto inline-translation-text-input 'Kitne baj rahe hain?'
- click inline-phrase-submit-button
- up
- seeToast toast-success
- notSee toast-error

# learner creates, posts, and the new phrase is linked to the request

// Follow-up: after creating the phrase, the learner completes the flow by
// posting it as an answer to the request. This exercises the full
// chat-to-answer workflow where the original bug surfaced.

cleanup: supabase.from('comment_phrase_link').delete().eq('uid', '[learner.key]').eq('request_id', 'e0d3a74e-4fe7-43c0-aa35-d05c83929986')
cleanup: supabase.from('request_comment').delete().eq('uid', '[learner.key]').eq('request_id', 'e0d3a74e-4fe7-43c0-aa35-d05c83929986').gte('created_at', '[testStart]')
cleanup: supabase.from('user_card').delete().eq('uid', '[learner.key]').eq('lang', 'hin').gte('created_at', '[testStart]')
cleanup: supabase.from('phrase_translation').delete().eq('added_by', '[learner.key]').eq('text', 'Namaste doston')
cleanup: supabase.from('phrase').delete().eq('added_by', '[learner.key]').eq('text', 'Hello friends')

learner:

- login
- openTo /friends/chats/[learner2.key]
- see chat-messages-container
- click chat-request-preview e0d3a74e-4fe7-43c0-aa35-d05c83929986
- up
- see request-detail-page
- click open-flashcard-search
- up
- see comment-dialog
- click create-new-phrase-button
- up
- see inline-phrase-creator
- typeInto inline-phrase-text-input 'Hello friends'
- typeInto inline-translation-text-input 'Namaste doston'
- click inline-phrase-submit-button
- up
- seeToast toast-success
- scope comment-dialog
- typeInto comment-content-input 'Here is a warm greeting to use with the group.'
- click post-comment-button
- up
- seeToast toast-success
- notSee toast-error
