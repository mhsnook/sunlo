# learner adds a translation to an existing phrase

cleanup: supabase.from('phrase_translation').delete().eq('added_by', '[learner.key]').gte('created_at', '[testStart]')

learner:

- login
- openTo /learn/[team.lang_partial]/phrases/[team.partial_attach_phrase]
- up
- click add-translations-trigger
- up
- see add-translations-dialog
- typeInto add-translations-dialog translation-text-input 'A test translation'
- click add-translations-dialog submit-button
- up
- seeToast toast-success

# learner opens the edit-tags dialog on a phrase

cleanup: supabase.from('phrase_tag').delete().eq('uid', '[learner.key]').gte('created_at', '[testStart]')

learner:

- login
- openTo /learn/[team.lang_partial]/phrases/[team.partial_attach_phrase]
- up
- click add-tags-trigger
- up
- see add-tags-dialog
- see add-tags-form
