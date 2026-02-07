# learner logs in

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- notSee login-form
- see decks-list-grid
- up
- see friends-section

# new-user logs in

new-user:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- notSee login-form
- see getting-started-page
