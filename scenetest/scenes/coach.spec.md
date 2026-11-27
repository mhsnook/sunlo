# learner opens the coach, asks for phrases and adds one from the page

// The coach agent runs on the scripted model in .flue/coach/mock.ts
// (VITE_COACH_USE_MOCK): it searches for whatever the learner types and
// shows the results on the page.

cleanup: supabase.from('user_card').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang_partial]').gte('created_at', '[testStart]')

learner:

- openTo /login?redirectedFrom=/coach
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
- seeText added “Ondu tea kodhe” · deck at
- see coach-deck-stack 884b7e6d-5aa0-49ba-be42-e26d37e20f12
- notSee coach-deck-flight
- notSee coach-phrases 884b7e6d-5aa0-49ba-be42-e26d37e20f12 coach-add-phrase

# learner asks the coach to add the whole set

cleanup: supabase.from('user_card').delete().eq('uid', '[learner.key]').eq('lang', '[team.lang_partial]').gte('created_at', '[testStart]')

learner:

- openTo /login?redirectedFrom=/coach
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
- seeText Adding
- seeText · deck at
- notSee coach-deck-flight
- notSee coach-phrases 884b7e6d-5aa0-49ba-be42-e26d37e20f12 coach-add-phrase

# learner has the coach draft a request, then posts it from the page

cleanup: supabase.from('phrase_request').delete().eq('requester_uid', '[learner.key]').eq('lang', '[team.lang_partial]').gte('created_at', '[testStart]')

learner:

- openTo /login?redirectedFrom=/coach
- typeInto email-input [self.email]
- typeInto password-input [self.password]
- click submit-button
- see coach-index-page
- click coach-language-list [team.lang_partial] coach-language-link
- up
- see coach-page
- typeInto coach-input "request: how do I say thank you for dinner"
- click coach-send
- see coach-request-draft
- seeText I put a draft on the page
- click coach-request-form submit-button
- seeText posted the request

# a visitor talks to the coach without an account, and the coach starts their deck

// The chat asks the visitor to log in or continue as a guest before it takes
// a message; a guest is signed in anonymously. The deck is created when the
// coach saves what they want to learn.

visitor:

- openTo /coach
- see coach-index-page
- click coach-language-list [team.lang_partial] coach-language-link
- up
- see coach-page
- seeText What brings you to Kannada?
- see coach-guest-choice
- click coach-continue-as-guest
- typeInto coach-input "I want to talk with my in-laws and I know a few greetings"
- click coach-send
- seeText I wrote that down
- seeText saved what you want to learn on your deck
- typeInto coach-input tea
- click coach-send
- see coach-phrases 884b7e6d-5aa0-49ba-be42-e26d37e20f12
- click coach-phrases 884b7e6d-5aa0-49ba-be42-e26d37e20f12 coach-add-phrase
- seeText added “Ondu tea kodhe”
- notSee coach-phrases 884b7e6d-5aa0-49ba-be42-e26d37e20f12 coach-add-phrase

# a visitor without an account sees the coach's request draft as text

visitor:

- openTo /coach
- see coach-index-page
- click coach-language-list [team.lang_partial] coach-language-link
- up
- see coach-page
- click coach-continue-as-guest
- typeInto coach-input "request: how do I say thank you for dinner"
- click coach-send
- see coach-request-needs-account
- notSee coach-request-form

# a guest asks the coach about an account and signs up from the chat

// Converting keeps the guest's uid. Until the link is opened, the address
// waits in new_email, so the cleanup matches both columns.

cleanup: supabase.auth.admin.listUsers({ perPage: 1000 }).then(({ data }) => Promise.all(data.users.filter((user) => [user.email, user.new_email].includes('sunloapp+guest@gmail.com')).map((user) => supabase.auth.admin.deleteUser(user.id))))

visitor:

- openTo /coach
- see coach-index-page
- click coach-language-list [team.lang_partial] coach-language-link
- up
- see coach-page
- click coach-continue-as-guest
- typeInto coach-input "can I make an account"
- click coach-send
- seeText An account keeps your deck
- click coach-create-account
- see guest-signup-dialog
- notSee guest-signup-dialog user-role
- typeInto guest-signup-dialog email-input sunloapp+guest@gmail.com
- typeInto guest-signup-dialog username-input GuestLearner
- click guest-signup-dialog submit-button
- see guest-signup-sent

# a guest who already asked for a link sees it again, not an empty form

cleanup: supabase.auth.admin.listUsers({ perPage: 1000 }).then(({ data }) => Promise.all(data.users.filter((user) => [user.email, user.new_email].includes('sunloapp+guest-again@gmail.com')).map((user) => supabase.auth.admin.deleteUser(user.id))))

visitor:

- openTo /coach
- see coach-index-page
- click coach-language-list [team.lang_partial] coach-language-link
- up
- see coach-page
- click coach-continue-as-guest
- typeInto coach-input "can I make an account"
- click coach-send
- seeText An account keeps your deck
- click coach-create-account
- typeInto guest-signup-dialog email-input sunloapp+guest-again@gmail.com
- typeInto guest-signup-dialog username-input GuestAgain
- click guest-signup-dialog submit-button
- see guest-signup-dialog guest-signup-sent
- click guest-signup-dialog guest-signup-skip
- notSee guest-signup-dialog
- click coach-create-account
- see guest-signup-dialog guest-signup-sent
- notSee guest-signup-dialog guest-signup-form
- click guest-signup-dialog guest-signup-send-again
- see guest-signup-dialog guest-signup-form

# a guest who opens an invite link signs up on /signup, with the role picker

// The second openTo stands for the guest opening a friend's invite link.

cleanup: supabase.auth.admin.listUsers({ perPage: 1000 }).then(({ data }) => Promise.all(data.users.filter((user) => [user.email, user.new_email].includes('sunloapp+guest-invited@gmail.com')).map((user) => supabase.auth.admin.deleteUser(user.id))))

visitor:

- openTo /coach
- see coach-index-page
- click coach-language-list [team.lang_partial] coach-language-link
- up
- see coach-page
- click coach-continue-as-guest
- see coach-input
- up
- openTo /signup?referrer=[friend.key]
- see guest-signup-form
- click guest-signup-form user-role helper
- typeInto guest-signup-form email-input sunloapp+guest-invited@gmail.com
- typeInto guest-signup-form username-input GuestInvited
- click guest-signup-form submit-button
- see guest-signup-sent

# the coach takes a guest to their deck, and the sign-up dialog opens there

visitor:

- openTo /coach
- see coach-index-page
- click coach-language-list [team.lang_partial] coach-language-link
- up
- see coach-page
- click coach-continue-as-guest
- typeInto coach-input "show me my deck"
- click coach-send
- see guest-signup-dialog
- click guest-signup-skip
- notSee guest-signup-dialog

# a guest who asks to review is asked to sign up on the review page

visitor:

- openTo /coach
- see coach-index-page
- click coach-language-list [team.lang_partial] coach-language-link
- up
- see coach-page
- click coach-continue-as-guest
- typeInto coach-input "let's review"
- click coach-send
- see guest-signup-form
- notSee guest-signup-dialog

# a guest's profile page asks for their email first

visitor:

- openTo /coach
- see coach-index-page
- click coach-language-list [team.lang_partial] coach-language-link
- up
- see coach-page
- click coach-continue-as-guest
- typeInto coach-input "open my profile"
- click coach-send
- see profile-needs-account guest-signup-form
