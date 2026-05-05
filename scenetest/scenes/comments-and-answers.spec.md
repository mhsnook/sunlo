# friend comments on learner's full-lang request and learner gets notified

cleanup: supabase.from('request_comment').delete().eq('uid', '[friend.key]').eq('request_id', '[team.full_request_for_comments]').gte('created_at', '[testStart]')
cleanup: supabase.from('notification').delete().eq('uid', '[learner.key]').eq('type', 'request_commented').gte('created_at', '[testStart]')

friend:

- login
- openTo /learn/[team.lang_full]/requests/[team.full_request_for_comments]
- up
- see request-detail-page
- click open-comment-dialog
- up
- scope comment-dialog
- typeInto content-input 'You can also try a follow-up question here'
- click submit-button
- up
- seeToast toast-success

learner:

- login
- openTo /notifications
- up
- see notifications-page
- seeText commented on your request

# learner2 replies to a comment and both learner and original commenter get notified

cleanup: supabase.from('request_comment').delete().eq('uid', '[learner2.key]').gte('created_at', '[testStart]')
cleanup: supabase.from('request_comment').delete().eq('parent_comment_id', '[team.full_seed_comment]')
cleanup: supabase.from('notification').delete().eq('type', 'comment_replied').gte('created_at', '[testStart]')

learner2:

- login
- openTo /learn/[team.lang_full]/requests/[team.full_request_for_comments]
- up
- see request-detail-page
- up
- scope comment-item [team.full_seed_comment]
- click reply-link
- up
- scope reply-dialog
- typeInto content-input 'Great tip! Here is another way to ask.'
- click submit-button
- up
- seeToast toast-success

learner:

- login
- openTo /notifications
- up
- seeText commented on your request

# learner3 answers a partial-lang request with phrase links

cleanup: supabase.from('comment_phrase_link').delete().eq('uid', '[learner3.key]').gte('created_at', '[testStart]')
cleanup: supabase.from('request_comment').delete().eq('uid', '[learner3.key]').eq('request_id', '[team.partial_request_for_answers]').gte('created_at', '[testStart]')
cleanup: supabase.from('notification').delete().eq('type', 'phrase_referenced').gte('created_at', '[testStart]')

learner3:

- login
- openTo /learn/[team.lang_partial]/requests/[team.partial_request_for_answers]
- up
- see request-detail-page
- click open-comment-dialog
- up
- scope comment-dialog
- typeInto content-input 'Here is a phrase that might help!'
- click attach-phrase-button
- up
- typeInto phrase-search-input [team.partial_attach_phrase_search]
- click phrase-picker-item
- up
- click submit-button
- up
- seeToast toast-success

# learner upvotes a request and requester gets notified

cleanup: supabase.from('phrase_request_upvote').delete().eq('uid', '[learner.key]').eq('request_id', '[team.partial_request_for_upvote]')
cleanup: supabase.from('notification').delete().eq('type', 'request_upvoted').gte('created_at', '[testStart]')

learner:

- login
- openTo /learn/[team.lang_partial]/requests/[team.partial_request_for_upvote]
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

# learner sees their own comments on the contributions page comments tab

// Exercises useAnyonesComments and the contributions Comments tab.
// Relies on the seeded learner comment on [team.partial_crud_request].

learner:

- login
- openTo /learn/[team.lang_partial]/contributions
- up
- see contributions-page
- click contributions-tab--comments
- up
- see contributions-comment-item [team.partial_learner_seed_comment]
- seeText [team.partial_learner_seed_comment_text]
