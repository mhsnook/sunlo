# bulk-add page loads with inline add bar and empty-state hint

learner:

- login
- openTo /learn/[team.lang_full]/bulk-add
- up
- see bulk-add-page
- see inline-add-bar
- see inline-add-bar inline-phrase-input
- see inline-add-bar inline-translation-input
- see inline-add-button
- see empty-state-hint
- notSee staged-phrases-list

# learner stages a phrase via the inline add bar

learner:

- login
- openTo /learn/[team.lang_full]/bulk-add
- up
- typeInto inline-phrase-input 'namaste duniya'
- pressKey Enter
- typeInto inline-translation-input 'hello world'
- pressKey Enter
- see staged-phrases-list
- seeText 1 phrase ready
- seeText namaste duniya
- seeText hello world
- notSee empty-state-hint

# learner stages multiple phrases and sees the running count

learner:

- login
- openTo /learn/[team.lang_full]/bulk-add
- up
- typeInto inline-phrase-input 'pehla vakya'
- typeInto inline-translation-input 'first sentence'
- click inline-add-button
- seeText 1 phrase ready
- typeInto inline-phrase-input 'doosra vakya'
- typeInto inline-translation-input 'second sentence'
- click inline-add-button
- seeText 2 phrases ready
- seeText pehla vakya
- seeText doosra vakya

# learner stages a phrase via the Add button

learner:

- login
- openTo /learn/[team.lang_full]/bulk-add
- up
- typeInto inline-phrase-input 'button vakya'
- typeInto inline-translation-input 'button sentence'
- click inline-add-button
- see staged-phrases-list
- seeText 1 phrase ready
- seeText button vakya

# learner removes a staged phrase

learner:

- login
- openTo /learn/[team.lang_full]/bulk-add
- up
- typeInto inline-phrase-input 'rakhne wala'
- typeInto inline-translation-input 'keep this one'
- click inline-add-button
- typeInto inline-phrase-input 'hatane wala'
- typeInto inline-translation-input 'remove this one'
- click inline-add-button
- seeText 2 phrases ready
- click staged-phrases-list remove-staged-phrase #2
- up
- seeText 1 phrase ready
- seeText rakhne wala

# learner clears all staged phrases

learner:

- login
- openTo /learn/[team.lang_full]/bulk-add
- up
- typeInto inline-phrase-input 'ek'
- typeInto inline-translation-input 'one'
- click inline-add-button
- typeInto inline-phrase-input 'do'
- typeInto inline-translation-input 'two'
- click inline-add-button
- seeText 2 phrases ready
- click clear-staged-phrases
- up
- see empty-state-hint
- notSee staged-phrases-list

# learner edits a staged phrase via the edit dialog

learner:

- login
- openTo /learn/[team.lang_full]/bulk-add
- up
- typeInto inline-phrase-input 'galt vakya'
- typeInto inline-translation-input 'wrong sentence'
- click inline-add-button
- seeText 1 phrase ready
- click staged-phrases-list edit-staged-phrase
- up
- see edit-phrase-text
- typeInto edit-phrase-text 'sahi vakya'
- typeInto edit-translation-0 'correct sentence'
- click edit-save-button
- up
- seeText sahi vakya
- seeText correct sentence

# learner submits staged phrases and sees them succeed

cleanup: supabase.from('phrase').delete().eq('added_by', '[learner.key]').in('text', ['Bulk scene phrase alpha', 'Bulk scene phrase beta'])

learner:

- login
- openTo /learn/[team.lang_full]/bulk-add
- up
- typeInto inline-phrase-input 'Bulk scene phrase alpha'
- typeInto inline-translation-input 'Bulk scene translation alpha'
- click inline-add-button
- typeInto inline-phrase-input 'Bulk scene phrase beta'
- typeInto inline-translation-input 'Bulk scene translation beta'
- click inline-add-button
- seeText 2 phrases ready
- click submit-staged-phrases
- up
- seeToast toast-success
- see success-section
- see success-phrase-list
