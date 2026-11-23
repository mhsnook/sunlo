# a signed-out visitor sends a library need, with an email for a reply

cleanup: supabase.from('feedback').delete().eq('message', 'Scenetest: more greetings for market days')

visitor:

- openTo /feedback
- see feedback-form
- click feedback-kind-options library
- see language-selector-button
- see contact-email-input
- typeInto message-input 'Scenetest: more greetings for market days'
- typeInto contact-email-input 'visitor@example.com'
- click submit-button
- up
- see feedback-sent-message
- click feedback-send-another-button
- see feedback-form

# a signed-in learner reaches the form from the sidebar and sends a bug

cleanup: supabase.from('feedback').delete().eq('uid', '[learner.key]')

learner:

- login
- click sidebar-feedback-link
- up
- see feedback-form
- notSee contact-email-input
- notSee language-selector-button
- typeInto message-input 'Scenetest: the review button did nothing'
- click submit-button
- up
- see feedback-sent-message
