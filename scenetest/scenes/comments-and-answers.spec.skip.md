# friend comments on learner's Hindi request and learner gets notified

// BLOCKED: Uses [testStart] in cleanup which is not yet supported in scenetest v0.2.0
// Also requires multi-actor flow (friend posts, learner checks notification)
// See scenetest/SETUP_DIRECTIVE.md for feature request details

cleanup: supabase.from('request_comment').delete().eq('uid', '[friend.key]').eq('request_id', '3f8c9e2a-1234-4567-89ab-cdef01234567').gte('created_at', '[testStart]')
cleanup: supabase.from('notification').delete().eq('uid', '[learner.key]').eq('type', 'request_commented').gte('created_at', '[testStart]')

friend:

- login
- openTo /learn/hin/requests/3f8c9e2a-1234-4567-89ab-cdef01234567
- up
- see request-detail-page
- click add-comment-button
- up
- see add-comment-dialog
- typeInto comment-content-input 'You can also try "haldi kitne ka hai?" for turmeric!'
- click submit-comment-button
- up
- seeToast toast-success

learner:

- login
- openTo /notifications
- up
- see notifications-page
- seeText commented on your request

# learner2 replies to a comment and both learner and original commenter get notified

// BLOCKED: Uses [testStart] in cleanup, multi-actor flow

cleanup: supabase.from('request_comment').delete().eq('uid', '[learner2.key]').gte('created_at', '[testStart]')
cleanup: supabase.from('notification').delete().eq('type', 'comment_replied').gte('created_at', '[testStart]')

learner2:

- login
- openTo /learn/hin/requests/e0d3a74e-4fe7-43c0-aa35-d05c83929986
- up
- see request-detail-page
- see comment-item
- click reply-to-comment-button
- up
- see add-comment-dialog
- typeInto comment-content-input 'Great tip! I also use "lehsun kitne ka hai?" for garlic.'
- click submit-comment-button
- up
- seeToast toast-success

learner:

- login
- openTo /notifications
- up
- seeText commented on your request

# learner3 answers a Kannada request with phrase links

// BLOCKED: Uses [testStart] in cleanup, phrase search/attach flow

cleanup: supabase.from('comment_phrase_link').delete().eq('uid', '[learner3.key]').gte('created_at', '[testStart]')
cleanup: supabase.from('request_comment').delete().eq('uid', '[learner3.key]').eq('request_id', '6c1f2a5d-4567-7890-12de-f01234567890').gte('created_at', '[testStart]')
cleanup: supabase.from('notification').delete().eq('type', 'phrase_referenced').gte('created_at', '[testStart]')

learner3:

- login
- openTo /learn/kan/requests/6c1f2a5d-4567-7890-12de-f01234567890
- up
- see request-detail-page
- click add-comment-button
- up
- see add-comment-dialog
- typeInto comment-content-input 'Here are the direction phrases!'
- click attach-phrase-button
- up
- typeInto phrase-search-input Amele
- click phrase-checkbox
- click add-selected-phrases-button
- up
- click submit-comment-button
- up
- seeToast toast-success

# learner upvotes a request and requester gets notified

// BLOCKED: Uses [testStart] in cleanup, multi-actor notification check

cleanup: supabase.from('phrase_request_upvote').delete().eq('uid', '[learner.key]').eq('request_id', '4a9d0f3b-2345-5678-90bc-def012345678')
cleanup: supabase.from('notification').delete().eq('type', 'request_upvoted').gte('created_at', '[testStart]')

learner:

- login
- openTo /learn/kan/requests/4a9d0f3b-2345-5678-90bc-def012345678
- up
- see request-detail-page
- click upvote-request-button
- up
- seeToast toast-success

learner2:

- login
- openTo /notifications
- up
- seeText upvoted your request
