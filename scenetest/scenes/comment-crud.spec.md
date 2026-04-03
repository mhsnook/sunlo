# friend posts a comment then edits it with a phrase link

// friend opens a Kannada request, posts a comment, then uses the
// URL-mode edit dialog to attach a phrase and update the text.
// Finally deletes the comment to clean up.

cleanup: supabase.from('comment_phrase_link').delete().eq('uid', '[friend.key]')
cleanup: supabase.from('request_comment').delete().eq('uid', '[friend.key]').eq('request_id', 'e40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96')

friend:

- login
- openTo /learn/kan/requests/e40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96
- see request-detail-page

// Post a new comment

- click add-comment-trigger
- up
- see add-comment-dialog
- typeInto comment-content-input 'Here is a useful phrase for ordering'
- click post-comment-button
- up

// Edit the comment to attach a phrase link

- see request-detail-page
- click edit-comment-button
- up
- see comment-dialog
- click attach-phrase-button
- typeInto phrase-search-input dosa
- click phrase-picker-item b0fbbe1d-705e-4d93-a231-ac55263fcfee
- see remove-phrase-button
- up
- typeInto edit-comment-content-input 'Updated: here is the phrase you need'
- click save-comment-button
- up

// Verify the phrase badge is visible on the saved comment

- see request-detail-page
- see comment-phrase-link-badge
- up

// Edit again to remove the phrase link

- see request-detail-page
- click edit-comment-button
- up
- see comment-dialog
- see remove-phrase-button
- click
- up
- typeInto edit-comment-content-input 'Actually just check the playlist'
- click save-comment-button
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

cleanup: supabase.from('request_comment').delete().eq('uid', '[learner.key]').eq('request_id', 'e40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96').neq('id', 'c0000004-4444-4555-8666-777777777777')

learner:

- login
- openTo /learn/kan/requests/e40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96
- see request-detail-page
- openTo /learn/kan/requests/e40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96?focus=c0000003-3333-4444-8555-666666666666&mode=reply
- see reply-dialog
- typeInto reply-content-input 'Thanks for the tip about dosas!'
- click post-reply-button
- up

// Edit the reply

- see request-detail-page
- click edit-reply-button
- up
- see reply-dialog
- typeInto edit-reply-content-input 'Thanks for the tip about dosas and coffee!'
- click save-reply-button
- up

// Delete the reply

- see request-detail-page
- see comment-reply
- click delete-comment-button
- up
- see delete-comment-dialog
- click confirm-delete-comment-button
- up
