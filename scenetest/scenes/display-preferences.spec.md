# learner opens display preferences from profile

learner:

- login
- openTo /learn
- click sidebar-user-menu-trigger
- click profile-menu-item
- up
- see profile-page
- click display-preferences-link
- up
- see display-preferences-page

# learner changes font preference to dyslexic

cleanup: supabase.from('user_profile').update({ font_preference: 'default' }).eq('uid', '[learner.key]')

learner:

- login
- openTo /profile/display-preferences
- up
- see display-preferences-page
- click font-preference-dyslexic
- up
- seeToast toast-success
- seeText OpenDyslexic

# learner sets global review answer mode to 2 buttons

cleanup: supabase.from('user_profile').update({ review_answer_mode: '4-buttons' }).eq('uid', '[learner.key]')

learner:

- login
- openTo /profile/display-preferences
- up
- see display-preferences-page
- click review-answer-mode-2-buttons
- up
- seeToast toast-success
- seeText 2 buttons

# learner sets global review answer mode back to 4 buttons

cleanup: supabase.from('user_profile').update({ review_answer_mode: '4-buttons' }).eq('uid', '[learner.key]')

learner:

- login
- openTo /profile/display-preferences
- up
- see display-preferences-page
- click review-answer-mode-4-buttons
- up
- seeToast toast-success
- seeText 4 buttons
