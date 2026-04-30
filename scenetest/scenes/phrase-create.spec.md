# learner creates a phrase via the new-phrase page

cleanup: supabase.from('phrase').delete().eq('added_by', '[learner.key]').gte('created_at', '[testStart]')

learner:

- login
- openTo /learn/hin/phrases/new
- up
- see add-phrase-page
- see add-phrase-form
- typeInto add-phrase-form phrase-text-input 'नमस्ते दोस्तों'
- typeInto add-phrase-form translation-text-input 'Hello friends (test)'
- click add-phrase-form submit-button
- up
- seeToast toast-success
