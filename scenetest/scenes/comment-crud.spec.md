# friend posts a comment with a phrase link on a Kannada request

// Uses the Kannada dosa request (owned by learner, has existing comments).
// friend opens the request, posts a comment via the URL-mode dialog,
// attaches a phrase by searching for 'e', then edits the comment to change
// the text and remove the phrase link, and finally deletes the comment.

cleanup: supabase.from('comment_phrase_link').delete().eq('uid', '[friend.key]').eq('request_id', 'e40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96')
cleanup: supabase.from('request_comment').delete().eq('uid', '[friend.key]').eq('request_id', 'e40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96')

friend:

- login
- openTo /learn/kan/requests/e40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96
- up
- see request-detail-page

// Post a new comment via the add-comment trigger

- click add-comment-trigger
- up
- see add-comment-dialog
- typeInto comment-content-input 'Here is a useful phrase for ordering'
- click post-comment-button
- up
- seeToast toast-success

// Verify the comment appeared

- seeText Here is a useful phrase for ordering

// Edit the comment: click edit to open URL-mode dialog

- click edit-comment-button
- up
- see comment-dialog

// Attach a phrase link: click suggest flashcard, search, pick one

- click attach-phrase-button
- up
- see phrase-search-input
- typeInto phrase-search-input e
- up
- click phrase-picker-item
- up

// Should see attached phrase card, now post the edit

- see remove-phrase-button
- typeInto edit-comment-content-input 'Updated: here is the phrase you need'
- click save-comment-button
- up
- seeToast toast-success
- seeText Updated: here is the phrase you need
- see comment-phrase-link-badge

// Edit again to remove the phrase link

- click edit-comment-button
- up
- see comment-dialog
- click remove-phrase-button
- up
- typeInto edit-comment-content-input 'Actually just check the playlist'
- click save-comment-button
- up
- seeToast toast-success
- seeText Actually just check the playlist
- notSee comment-phrase-link-badge

// Delete the comment

- click delete-comment-button
- up
- see delete-comment-dialog
- click confirm-delete-comment-button
- up
- seeToast toast-success
- notSee Actually just check the playlist

# learner replies to an existing comment, edits the reply, then deletes it

// learner opens the same Kannada request and replies to learner2's comment,
// then edits and deletes the reply.

cleanup: supabase.from('request_comment').delete().eq('uid', '[learner.key]').eq('request_id', 'e40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96').neq('id', 'c0000004-4444-4555-8666-777777777777')

learner:

- login
- openTo /learn/kan/requests/e40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96
- up
- see request-detail-page

// Open the reply thread on learner2's comment and reply

- see comment-item c0000003-3333-4444-8555-666666666666
- click reply-link
- up
- see add-reply-inline
- click add-reply-inline
- up
- see reply-dialog
- typeInto reply-content-input 'Thanks for the tip about dosas!'
- click post-reply-button
- up
- seeToast toast-success
- seeText Thanks for the tip about dosas!

// Edit the reply

- click edit-reply-button
- up
- see reply-dialog
- typeInto edit-reply-content-input 'Thanks for the tip about dosas and coffee!'
- click save-reply-button
- up
- seeToast toast-success
- seeText Thanks for the tip about dosas and coffee!

// Delete the reply

- click delete-comment-button
- up
- see delete-comment-dialog
- click confirm-delete-comment-button
- up
- seeToast toast-success
- notSee Thanks for the tip about dosas and coffee!
