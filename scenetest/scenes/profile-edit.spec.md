# learner changes their username

cleanup: supabase.from('user_profile').update({ username: 'GarlicFace' }).eq('uid', '[learner.key]')

learner:

- login
- openTo /profile
- up
- see profile-page
- see update-profile-form
- typeInto update-profile-form username-input 'GarlicFace2'
- click update-profile-form submit-button
- up
- seeToast toast-success

# learner adds a known language, changes its proficiency, saves, then verifies it persisted after navigating away

cleanup: supabase.from('user_profile').update({ languages_known: [{ lang: 'eng', level: 'fluent' }] }).eq('uid', '[learner.key]')

learner:

- login
- openTo /profile
- up
- see update-profile-form
- see languages-known
- click add-language-button
- up
- see languages-known 1
- click languages-known 1 language-selector-button
- up
- typeInto language-search-input Hindi
- click language-options hin
- up
- click languages-known 1 level-trigger
- up
- click level-beginner
- up
- click update-profile-form submit-button
- up
- seeToast toast-success
- openTo /learn
- up
- see decks-list-grid
- openTo /profile
- up
- see update-profile-form
- see languages-known 1
