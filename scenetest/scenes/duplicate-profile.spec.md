// Issue #134 - "Client Error: RLS violated while trying to set up a new profile"
//
// A user can end up on /getting-started while a profile row already exists
// for them on the server (stale cache, back-button after onboarding, a
// second tab that finished first). The current mutation upserts with
// `.match({ uid })`; when RLS blocks it the toast surfaces the raw error
// and the user is stranded on the form. The issue asks for an onError
// guard that calls getUser() and redirects.
//
// These scenes lock in the expected behavior so a fix can't regress:
// 1. happy path still works
// 2. an existing profile short-circuits the page before the form renders

# new user completes onboarding and lands on welcome

cleanup: supabase.from('user_profile').delete().eq('uid', '[new-user.key]')

new-user:

- login
- seeToast toast-success
- see getting-started-page
- typeInto profile-creation-form username-input NewLearner1
- click profile-creation-form submit-button
- up
- see welcome-page
- notSee toast-error

# existing profile short-circuits the getting-started form

setup: supabase.from('user_profile').upsert({ uid: '[new-user.key]', username: 'PreseededNewcomer', languages_known: [{ lang: 'eng', level: 'fluent' }] })
cleanup: supabase.from('user_profile').delete().eq('uid', '[new-user.key]')

new-user:

- login
- openTo /getting-started
- up
- notSee getting-started-page
- notSee profile-creation-form
- notSee toast-error
- see welcome-page
