# learner logs in

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click submit-button
- notSee login-form
- see decks-list-grid

# new-user logs in and is nudged to finish onboarding

new-user:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click submit-button
- up
- notSee login-form
- see onboarding-nudge
