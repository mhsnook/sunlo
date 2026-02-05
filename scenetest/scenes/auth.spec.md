# learner logs in and sees their decks

learner:

- openTo /login
- see login-form
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- see welcome-page
- click go-to-decks-button
- see decks-list-grid
- see friends-section

# new user completes onboarding and affirms community norms

new-user:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /welcome
- see welcome-page
- see community-norms-dialog
- click affirm-community-norms-button
- see sunlo-welcome-explainer
- click go-to-decks-button
- see decks-list-grid

# user signs out and is redirected to home

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click login-submit-button
- openTo /learn
- see decks-list-grid
- click sidebar-user-menu-trigger
- click sidebar-signout-button
- see login-link
- notSee sidebar-user-menu-trigger

# visitor can browse languages without logging in

visitor:

- openTo /
- see landing-page
- click browse-languages-link
- see browse-page
- see language-card-list
- click language-card-list hin
- see language-detail-page

# visitor sees login prompt on protected pages

visitor:

- openTo /learn
- see logged-out-learn-page
- see browse-languages-prompt
- see login-link
