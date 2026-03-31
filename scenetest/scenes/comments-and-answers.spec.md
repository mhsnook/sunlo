# learner views comments with replies on a Hindi request

learner:

- login
- openTo /learn/hin/contributions
- click contributions-tab--requests
- up
- click request-item
- up
- see request-detail-page
- see comment-item
- see comment-reply

# learner views comments with phrase links on a Kannada request

learner:

- login
- openTo /learn/kan/contributions
- click contributions-tab--requests
- up
- click request-item
- up
- see request-detail-page
- see comment-item
- see comment-phrase-link-badge

# friend comments on learner's Hindi request and learner gets notified

cleanup: supabase.from('request_comment').delete().eq('uid', '[friend.key]').eq('request_id', '3f8c9e2a-1234-4567-89ab-cdef01234567').gte('created_at', '[testStart]')
cleanup: supabase.from('notification').delete().eq('uid', '[learner.key]').eq('type', 'request_commented').gte('created_at', '[testStart]')

friend:

- login
- openTo /learn/hin/contributions
- click contributions-tab--requests
- up
- click other-user-request-item
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
- see notification-bell
- see notification-badge
- click notification-bell
- up
- see notifications-page
- seeText commented on your request

# learner2 replies to a comment and both learner and original commenter get notified

cleanup: supabase.from('request_comment').delete().eq('uid', '[learner2.key]').gte('created_at', '[testStart]')
cleanup: supabase.from('notification').delete().eq('type', 'comment_replied').gte('created_at', '[testStart]')

learner2:

- login
- openTo /learn/hin/contributions
- click contributions-tab--requests
- up
- click request-item
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

// Original request owner (learner) should see notification
learner:

- login
- see notification-badge
- click notification-bell
- up
- seeText commented on your request

# learner3 answers a Kannada request with phrase links

cleanup: supabase.from('comment_phrase_link').delete().eq('uid', '[learner3.key]').gte('created_at', '[testStart]')
cleanup: supabase.from('request_comment').delete().eq('uid', '[learner3.key]').eq('request_id', '6c1f2a5d-4567-7890-12de-f01234567890').gte('created_at', '[testStart]')
cleanup: supabase.from('notification').delete().eq('type', 'phrase_referenced').gte('created_at', '[testStart]')

learner3:

- login
- openTo /learn/kan/contributions
- click contributions-tab--requests
- up
- click other-user-request-item
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
- up
- click submit-comment-button
- up
- seeToast toast-success

# learner upvotes a request and requester gets notified

cleanup: supabase.from('phrase_request_upvote').delete().eq('uid', '[learner.key]').eq('request_id', '4a9d0f3b-2345-5678-90bc-def012345678')
cleanup: supabase.from('notification').delete().eq('type', 'request_upvoted').gte('created_at', '[testStart]')

learner:

- login
- openTo /learn/kan/contributions
- click contributions-tab--requests
- up
- click other-user-request-item
- up
- see request-detail-page
- click upvote-request-button
- up
- seeToast toast-success

// Request owner (learner2) should see upvote notification
learner2:

- login
- see notification-badge
- click notification-bell
- up
- seeText upvoted your request
