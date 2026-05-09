# learner logs in and sees their decks

learner:

- login
- see sidebar-user-menu-trigger
- see decks-list-grid

# new user completes onboarding and affirms community norms

cleanup: supabase.from('user_profile').delete().eq('uid', '[new-user.key]')

new-user:

- login
- seeToast toast-success
- see getting-started-page
- see profile-creation-form
- typeInto profile-creation-form username-input 'NewLearnerName'
- click profile-creation-form submit-button
- up
- seeToast toast-success

# user signs out and is redirected to home

learner:

- login
- openTo /learn
- see decks-list-grid
- up
- click sidebar-user-menu-trigger
- click sidebar-signout-button
- up
- see landing-page
- see homepage-login-link
- notSee homepage-app-link
- notSee sidebar-user-menu-trigger
- openTo /learn
- see logged-out-learn-page
- notSee decks-list-grid

# visitor can browse languages without logging in

visitor:

- openTo /
- see landing-page
- click browse-languages-link
- up
- see browse-page
- see language-card-list
- scope [team.lang_full]
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

# visitor sees login options in sidebar on language page

visitor:

- openTo /learn/[team.lang_full]/feed
- up
- see deck-feed-page
- see login-link

# learner session persists after page reload

learner:

- login
- see sidebar-user-menu-trigger
- see decks-list-grid
- reload
- see sidebar-user-menu-trigger
- see decks-list-grid

# logged-in user sees app link on homepage, not login link

learner:

- login
- openTo /
- see homepage-app-link
- notSee homepage-login-link

# learner signs out, browses as visitor, logs back in and sees decks

learner:

- login
- see decks-list-grid
- click sidebar-user-menu-trigger
- click sidebar-signout-button
- up
- see landing-page
- openTo /learn/browse
- see browse-page
- login
- see sidebar-user-menu-trigger
- see decks-list-grid
