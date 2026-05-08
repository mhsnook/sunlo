# learner creates a phrase via the new-phrase page

cleanup: supabase.from('phrase').delete().eq('added_by', '[learner.key]').gte('created_at', '[testStart]')

learner:

- login
- openTo /learn/[team.lang_full]/phrases/new
- up
- see add-phrase-page
- see add-phrase-form
- typeInto add-phrase-form phrase-text-input '[team.full_test_phrase_text]'
- typeInto add-phrase-form translation-text-input '[team.full_test_phrase_translation]'
- click add-phrase-form submit-button
- up
- seeToast toast-success
