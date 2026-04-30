# learner creates a new phrase request

cleanup: supabase.from('phrase_request').delete().eq('requester_uid', '[learner.key]').eq('lang', 'kan').gte('created_at', '[testStart]')

learner:

- login
- openTo /learn/kan/requests/new
- up
- see new-request-form
- typeInto new-request-form prompt-input 'How do I say good morning casually?'
- click new-request-form submit-button
- up
- seeToast toast-success
- see request-detail-page

# learner edits their request

cleanup: supabase.from('phrase_request').upsert({ id: 'e40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96', requester_uid: '[learner.key]', lang: 'kan', prompt: 'How do I order a dosa and a coffee?', upvote_count: 0, deleted: false })

learner:

- login
- openTo /learn/kan/requests/e40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96
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

cleanup: supabase.from('phrase_request').upsert({ id: 'e40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96', requester_uid: '[learner.key]', lang: 'kan', prompt: 'How do I order a dosa and a coffee?', upvote_count: 0, deleted: false })

learner:

- login
- openTo /learn/kan/contributions
- up
- see contributions-page
- click contributions-tab--requests
- up
- click request-item e40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96
- up
- see request-detail-page
- click delete-request-button
- up
- see delete-request-dialog
- click confirm-delete-button
- up
- seeToast toast-success
- see deck-feed-page
