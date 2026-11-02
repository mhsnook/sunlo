# learner opens the coach, asks for phrases and adds one from the page

// The coach runs on the scripted mock model (VITE_COACH_USE_MOCK), which
// searches for whatever the learner types and shows the results on the page.

cleanup: supabase.from('user_card').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang_partial]').gte('created_at', '[testStart]')

learner:

- openTo /coach
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click submit-button
- see coach-index-page
- click coach-language-list [team.lang_partial] coach-language-link
- up
- see coach-page
- see coach-deck-meter
- seeText What brings you to Kannada?
- see coach-suggestions
- typeInto coach-input tea
- click coach-send
- see coach-learner-message
- see coach-phrases 884b7e6d-5aa0-49ba-be42-e26d37e20f12
- seeText Showing
- click coach-phrases 884b7e6d-5aa0-49ba-be42-e26d37e20f12 coach-add-phrase
- seeText added “Ondu tea kodhe”
- notSee coach-phrases 884b7e6d-5aa0-49ba-be42-e26d37e20f12 coach-add-phrase

# learner asks the coach to add the whole set

cleanup: supabase.from('user_card').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang_partial]').gte('created_at', '[testStart]')

learner:

- openTo /coach
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click submit-button
- see coach-index-page
- click coach-language-list [team.lang_partial] coach-language-link
- up
- see coach-page
- typeInto coach-input tea
- click coach-send
- see coach-phrases 884b7e6d-5aa0-49ba-be42-e26d37e20f12
- typeInto coach-input "add them all"
- click coach-send
- see coach-action
- seeText Your deck is at
- notSee coach-phrases 884b7e6d-5aa0-49ba-be42-e26d37e20f12 coach-add-phrase
