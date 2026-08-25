# learner creates a new phrase request

cleanup: supabase.from('phrase_request').delete().eq('requester_uid', '[learner.key]').eq('lang', '[team.lang_partial]').gte('created_at', '[testStart]')

learner:

- login
- openTo /learn/[team.lang_partial]/requests/new
- up
- see new-request-form
- typeInto new-request-form prompt-input 'How do I say good morning casually?'
- click new-request-form submit-button
- up
- seeToast toast-success
- see request-detail-page

# learner edits their request

cleanup: supabase.from('phrase_request').upsert({ id: '[team.partial_crud_request]', requester_uid: '[learner.key]', lang: '[team.lang_partial]', prompt: '[team.partial_crud_request_prompt]', upvote_count: 0, deleted: false })

learner:

- login
- openTo /learn/[team.lang_partial]/requests/[team.partial_crud_request]
- up
- see request-detail-page
- click update-request-button
- up
- see edit-request-dialog
- typeInto edit-request-form prompt-input 'Updated: How do I say good afternoon?'
- click edit-request-form submit-button
- up
- seeToast toast-success
- seeText Updated: How do I say good afternoon?

# learner deletes their request

cleanup: supabase.from('phrase_request').upsert({ id: '[team.partial_crud_request]', requester_uid: '[learner.key]', lang: '[team.lang_partial]', prompt: '[team.partial_crud_request_prompt]', upvote_count: 0, deleted: false })

learner:

- login
- openTo /learn/[team.lang_partial]/contributions
- up
- see contributions-page
- click contributions-tab--requests
- up
- click request-item [team.partial_crud_request]
- up
- see request-detail-page
- click delete-request-button
- up
- see delete-request-dialog
- click confirm-delete-button
- up
- seeToast toast-success
- see deck-feed-page

# a non-owner sees no edit or delete controls on a request

// Ownership gating on the request itself, mirroring the comment-level check in
// comment-crud.spec.md. [team.partial_request_for_upvote] belongs to learner2,
// so learner may read it but must not be offered the owner controls. Pairs with
// the RLS policies on phrase_request for defense in depth.

learner:

- login
- openTo /learn/[team.lang_partial]/requests/[team.partial_request_for_upvote]
- up
- see request-detail-page
- notSee update-request-button
- notSee delete-request-button

# learner copies a link to a comment

// The permalink points back at the request with the comment id in `focus`, so
// the link opens the thread scrolled to that comment. Writing to the clipboard
// needs a browser permission, granted for every actor in scenetest/config.ts.

learner:

- login
- openTo /learn/[team.lang_partial]/requests/[team.partial_crud_request]
- up
- see request-detail-page
- click comment-item [team.partial_learner_seed_comment] comment-context-menu-trigger
- up
- click copy-link-menu-item
- up
- seeToast toast-success
