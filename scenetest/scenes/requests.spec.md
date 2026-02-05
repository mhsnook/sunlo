# learner creates a new phrase request

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn/hin/contributions
- click contributions-tab--requests
- click new-request-link
- see new-request-form
- typeInto request-prompt-input 'How do I say "good morning" casually?'
- click post-request-button
- seeToast toast-request-created
- see request-detail-page

# learner edits their request

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn/hin/contributions
- click contributions-tab--requests
- click request-item
- see request-detail-page
- click update-request-button
- see edit-request-dialog
- typeInto edit-request-prompt-input 'Updated: How do I say "good afternoon"?'
- click save-request-button
- seeToast toast-request-updated
- seeText 'Updated: How do I say "good afternoon"?'

# learner deletes their request

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn/hin/contributions
- click contributions-tab--requests
- click request-item
- see request-detail-page
- click delete-request-button
- see delete-request-dialog
- click confirm-delete-button
- seeToast toast-request-deleted
- see deck-feed-page

# non-owner cannot edit or delete request

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn/hin/contributions
- click contributions-tab--requests
- click other-user-request-item
- see request-detail-page
- notSee update-request-button
- notSee delete-request-button

# learner copies comment permalink

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn/hin/contributions
- click contributions-tab--requests
- click request-item
- see comment-item
- click comment-context-menu-trigger
- click copy-link-menu-item
- seeToast toast-link-copied
