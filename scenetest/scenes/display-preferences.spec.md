# learner opens display preferences from profile

learner:

- login
- openTo /profile
- up
- see profile-page
- see display-preferences-page

# learner changes font preference to dyslexic

cleanup: supabase.from('user_profile').update({ font_preference: 'default' }).eq('uid', '[learner.key]')

learner:

- login
- openTo /profile
- up
- see display-preferences-page
- click font-preference-dyslexic
- up
- seeToast toast-success

# learner sets global review answer mode to 2 buttons

cleanup: supabase.from('user_profile').update({ review_answer_mode: '2-buttons' }).eq('uid', '[learner.key]')

learner:

- login
- openTo /profile
- up
- see display-preferences-page
- click answer-mode-2-buttons
- up
- seeToast toast-success
