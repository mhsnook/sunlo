# login page shows signup and forgot-password links

visitor:

- openTo /login
- see login-form
- see login-signup-link
- see login-forgot-password-link

# login with the wrong password shows a friendly error

learner:

- openTo /login
- typeInto email-input [self.email]
- typeInto password-input 'definitely-not-the-password'
- click submit-button
- up
- see login-error-invalid-credentials
- see login-form
- click submit-button
- up
- see login-error-invalid-credentials

# learner logs in and sees their decks

learner:

- login
- see sidebar-profile-settings-link
- see decks-list-grid

# new user follows the onboarding nudge and completes setup

cleanup: supabase.from('user_profile').update({ username: null, languages_known: [], flags: { 'needs-onboarding': true } }).eq('uid', '[new-user.key]')

new-user:

- login
- seeToast toast-success
- see onboarding-nudge
- click onboarding-nudge-cta
- up
- see getting-started-page
- see profile-creation-form
- typeInto profile-creation-form username-input 'NewLearnerName'
- click profile-creation-form submit-button
- up
- seeToast toast-success
- notSee onboarding-nudge

# user signs out and is redirected to home

learner:

- login
- openTo /learn
- see decks-list-grid
- up
- click sidebar-profile-settings-link
- up
- see profile-page
- click profile-signout-button
- up
- see landing-page
- see homepage-login-link
- notSee homepage-app-link
- notSee sidebar-profile-settings-link
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
- see sidebar-profile-settings-link
- see decks-list-grid
- openTo /learn
- see sidebar-profile-settings-link
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
- click sidebar-profile-settings-link
- up
- see profile-page
- click profile-signout-button
- up
- see landing-page
- openTo /browse
- see browse-page
- login
- see sidebar-profile-settings-link
- see decks-list-grid
