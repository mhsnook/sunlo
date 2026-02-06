# learner logs in and sees their decks

learner:

- login
- see decks-list-grid
- up
- see friends-section

# new user completes onboarding and affirms community norms

new-user:

- login
- see getting-started-page

# user signs out and is redirected to home

learner:

- login
- openTo /learn
- see decks-list-grid
- up
- click sidebar-user-menu-trigger
- click sidebar-signout-button
- up
- see login-link
- notSee sidebar-user-menu-trigger

# visitor can browse languages without logging in

visitor:

- openTo /
- see landing-page
- click browse-languages-link
- up
- see browse-page
- see language-card-list
- see hin
- click explore-language-link
- up
- see deck-feed-page

# visitor sees login prompt on protected pages

visitor:

- openTo /learn
- see logged-out-learn-page
- see browse-languages-prompt
- up
- see login-link
