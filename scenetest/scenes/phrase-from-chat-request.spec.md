// Issue #202 - "Error creating phrase from request from chat"
//
// learner2 shared the seeded full-lang request with learner in chat.
// The learner taps the request preview bubble, opens the flashcard search
// dialog from the request page, then creates a brand-new phrase inline. The
// bug historically surfaced at the final submit; these scenes fail if the
// create mutation toasts an error instead of success.

# learner creates a phrase from a request shared in chat

cleanup: supabase.from('comment_phrase_link').delete().eq('uid', '[learner.key]').eq('request_id', '[team.full_shared_chat_request]')
cleanup: supabase.from('request_comment').delete().eq('uid', '[learner.key]').eq('request_id', '[team.full_shared_chat_request]').gte('created_at', '[testStart]')
cleanup: supabase.from('user_card').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang_full]').gte('created_at', '[testStart]')
cleanup: supabase.from('phrase_translation').delete().eq('added_by', '[learner.key]').eq('text', '[team.full_chat_phrase_a_translation]')
cleanup: supabase.from('phrase').delete().eq('added_by', '[learner.key]').eq('text', '[team.full_chat_phrase_a_text]')

learner:

- login
- openTo /friends/chats/[learner2.key]
- see chat-messages-container
- click chat-request-preview [team.full_shared_chat_request]
- up
- see request-detail-page
- click open-flashcard-search
- up
- see comment-dialog
- click create-new-phrase-button
- up
- see inline-phrase-creator
- typeInto inline-phrase-creator phrase-text-input '[team.full_chat_phrase_a_text]'
- typeInto inline-phrase-creator translation-text-input '[team.full_chat_phrase_a_translation]'
- click inline-phrase-creator submit-button
- up
- seeToast toast-success
- notSee toast-error

# learner creates, posts, and the new phrase is linked to the request

// Follow-up: after creating the phrase, the learner completes the flow by
// posting it as an answer to the request. This exercises the full
// chat-to-answer workflow where the original bug surfaced.

cleanup: supabase.from('comment_phrase_link').delete().eq('uid', '[learner.key]').eq('request_id', '[team.full_shared_chat_request]')
cleanup: supabase.from('request_comment').delete().eq('uid', '[learner.key]').eq('request_id', '[team.full_shared_chat_request]').gte('created_at', '[testStart]')
cleanup: supabase.from('user_card').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang_full]').gte('created_at', '[testStart]')
cleanup: supabase.from('phrase_translation').delete().eq('added_by', '[learner.key]').eq('text', '[team.full_chat_phrase_b_translation]')
cleanup: supabase.from('phrase').delete().eq('added_by', '[learner.key]').eq('text', '[team.full_chat_phrase_b_text]')

learner:

- login
- openTo /friends/chats/[learner2.key]
- see chat-messages-container
- click chat-request-preview [team.full_shared_chat_request]
- up
- see request-detail-page
- click open-flashcard-search
- up
- see comment-dialog
- click create-new-phrase-button
- up
- see inline-phrase-creator
- typeInto inline-phrase-creator phrase-text-input '[team.full_chat_phrase_b_text]'
- typeInto inline-phrase-creator translation-text-input '[team.full_chat_phrase_b_translation]'
- click inline-phrase-creator submit-button
- up
- seeToast toast-success
- scope comment-dialog
- typeInto content-input 'Here is a warm greeting to use with the group.'
- click submit-button
- up
- seeToast toast-success
- notSee toast-error
