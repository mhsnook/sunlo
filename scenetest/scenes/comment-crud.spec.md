# friend posts a comment then edits it with a phrase link

// friend opens a Kannada request, posts a comment, then uses the
// URL-mode edit dialog to attach a phrase and update the text.
// Finally deletes the comment to clean up.

cleanup: supabase.from('comment_phrase_link').delete().eq('uid', '[friend.key]')
cleanup: supabase.from('request_comment').delete().eq('uid', '[friend.key]').eq('request_id', '[team.comment_crud_request]')

friend:

- login
- openTo /learn/[team.lang]/requests/[team.comment_crud_request]
- up
- up
- see request-detail-page

// Post a new comment

- click open-comment-dialog
- up
- scope comment-dialog
- typeInto content-input 'Here is a useful phrase for ordering'
- click submit-button
- up

// Edit the comment to attach a phrase link

- see request-detail-page
- click edit-comment-button
- up
- scope comment-dialog
- click attach-phrase-button
- typeInto phrase-search-input dosa
- click phrase-picker-item [team.attach_phrase]
- see remove-phrase-button
- up
- typeInto content-input 'Updated: here is the phrase you need'
- click submit-button
- up

// Verify the phrase badge is visible on the saved comment.
// [team.phrase_linked_seed_comment] also has a phrase link and is seeded with a
// high upvote_count so it sorts above friend's, so friend's badge is the
// second in DOM order. (See actors/default.ts for the invariant.)

- see request-detail-page
- see comment-phrase-link-badge #2
- up

// Edit again to remove the phrase link

- see request-detail-page
- click edit-comment-button
- up
- scope comment-dialog
- scope remove-phrase-button
- click
- up
- typeInto content-input 'Actually just check the playlist'
- click submit-button
- up

// Delete the comment

- see request-detail-page
- click delete-comment-button
- up
- see delete-comment-dialog
- click confirm-delete-comment-button
- up

# learner replies to an existing comment then edits and deletes the reply

// learner opens the request page, waits for collections to load,
// then navigates to the reply URL to open the reply dialog.

cleanup: supabase.from('request_comment').delete().eq('uid', '[learner.key]').eq('request_id', '[team.comment_crud_request]').neq('id', 'c0000004-4444-4555-8666-777777777777')

learner:

- login
- openTo /learn/[team.lang]/requests/[team.comment_crud_request]
- up
- see request-detail-page
- click comment-item c0000003-3333-4444-8555-666666666666 reply-link
- scope reply-dialog
- typeInto content-input 'Thanks for the tip about dosas!'
- click submit-button
- up

// Edit the reply

- see request-detail-page
- click edit-reply-button
- up
- scope reply-dialog
- typeInto content-input 'Thanks for the tip about dosas and coffee!'
- click submit-button
- up

// Delete the reply

- see request-detail-page
- scope comment-reply
- click delete-comment-button
- up
- see delete-comment-dialog
- click confirm-delete-comment-button
- up

# friend cannot edit or delete learner2's seeded comment

// Ownership gating: viewing someone else's comment, the edit and delete
// controls must not render. Pairs with the RLS policies on request_comment
// (Users can update/delete own comments) for defense in depth.

friend:

- login
- openTo /learn/[team.lang]/requests/[team.comment_crud_request]
- up
- see request-detail-page
- scope comment-item [team.phrase_linked_seed_comment]
- notSee edit-comment-button
- notSee delete-comment-button
