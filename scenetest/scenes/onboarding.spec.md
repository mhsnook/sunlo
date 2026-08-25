# new user follows the nudge, completes setup, and the form short-circuits afterward

cleanup: supabase.from('user_profile').update({ username: null, languages_known: [], flags: { 'needs-onboarding': true } }).eq('uid', '[new-user.key]')

new-user:

- login
- seeToast toast-success
- see onboarding-nudge
- click onboarding-nudge-cta
- up
- see getting-started-page
- see profile-creation-form
- typeInto profile-creation-form username-input NewLearner1
- click profile-creation-form submit-button
- up
- see welcome-page
- notSee toast-error
- notSee onboarding-nudge
- openTo /getting-started
- up
- notSee profile-creation-form
- see welcome-page

# a new user must affirm the community norms before using the app

// Ported from the retired e2e spec `onboarding.spec.ts`. The affirmation is
// recorded in localStorage, so the second `openTo /welcome` is the assertion
// rather than navigation: reloading proves the dialog does not come back.

new-user:

- login
- openTo /welcome
- up
- see intro-message-section
- see affirm-community-norms-button
- click affirm-community-norms-button
- up
- notSee intro-message-section
- see sunlo-welcome-explainer
- openTo /welcome
- up
- see sunlo-welcome-explainer
- notSee intro-message-section
