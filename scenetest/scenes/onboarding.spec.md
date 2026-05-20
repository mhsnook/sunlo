# onboarding flow — trigger-created profile, soft nudge, no redirect

#

# Every confirmed auth user gets a user_profile row from a DB trigger, so

# there is no client-side profile creation and no /getting-started

# redirect (this replaces the issue #134 RLS-violation race entirely).

# The sidebar nudge, shown while flags->>'needs-onboarding' is set, pulls

# the user to /getting-started, which _updates_ the row and clears the

# flag. A user who has already onboarded is sent straight onward.

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
