// # learner creates a new phrase request
//
// learner:
//
// - login
// - openTo /learn/[team.lang]/contributions
// - click contributions-tab--requests
// - click new-request-link
// - up
// - see new-request-form
// - typeInto request-prompt-input 'How do I say good morning casually?'
// - click post-request-button
// - up
// - seeToast toast-success
// - up
// - see request-detail-page

// # learner edits their request
//
// cleanup: supabase.from('phrase_request').upsert({ id: 'e40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96', requester_uid: 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', lang: 'kan', prompt: 'How do I order a dosa and a coffee?', upvote_count: 0, deleted: false })
//
// learner:
//
// - login
// - openTo /learn/[team.lang]/contributions
// - click contributions-tab--requests
// - click request-item
// - up
// - see request-detail-page
// - up
// - click update-request-button
// - see edit-request-dialog
// - typeInto edit-request-prompt-input 'Updated: How do I say good afternoon?'
// - click save-request-button
// - up
// - seeToast toast-success
// - up
// - seeText Updated: How do I say good afternoon?

# learner deletes their request

cleanup: supabase.from('phrase_request').upsert({ id: 'e40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96', requester_uid: 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', lang: 'kan', prompt: 'How do I order a dosa and a coffee?', upvote_count: 0, deleted: false })

learner:

- login
- openTo /learn/[team.lang]/contributions
- click contributions-tab--requests
- click request-item
- up
- see request-detail-page
- up
- click delete-request-button
- see delete-request-dialog
- click confirm-delete-button
- up
- seeToast toast-success
- up
- see deck-feed-page

// # non-owner cannot edit or delete request
//
// learner:
//
// - openTo /login
// - typeInto email-input [self.email]
// - typeInto password-input [self.password]
// - click login-submit-button
// - openTo /learn/[team.lang]/contributions
// - click contributions-tab--requests
// - click other-user-request-item
// - see request-detail-page
// - notSee update-request-button
// - notSee delete-request-button

// # learner copies comment permalink
//
// learner:
//
// - login
// - openTo /learn/[team.lang]/contributions
// - click contributions-tab--requests
// - click request-item
// - up
// - see comment-item
// - click comment-context-menu-trigger
// - up
// - click copy-link-menu-item
// - up
// - seeToast toast-success
