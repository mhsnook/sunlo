# admin sees gear icon and navigates to phrase admin detail

// Admin user (learner promoted via setup) visits a phrase page,
// sees the admin gear icon, clicks it and lands on the admin
// detail page for that phrase.

setup: supabase.from('admin_user').upsert({ uid: '[learner.key]' })
cleanup: supabase.from('admin_user').delete().eq('uid', '[learner.key]')

learner:

- login
- openTo /learn/[team.lang]/phrases/[team.nocard_phrase]
- up
- see admin-gear-link
- click admin-gear-link
- up
- see admin-phrases-page
- see admin-phrase-detail

# admin can browse phrases table and drill into detail

setup: supabase.from('admin_user').upsert({ uid: '[learner.key]' })
cleanup: supabase.from('admin_user').delete().eq('uid', '[learner.key]')

learner:

- login
- openTo /admin/[team.lang]/phrases
- up
- see admin-phrases-page
- see admin-phrases-table
- click admin-phrase-detail-link
- up
- see admin-phrase-detail

# admin can archive a phrase from detail page

// Admin navigates to a specific phrase in the admin detail view
// and clicks the archive button. The RPC succeeds and a success
// toast is shown.

setup: supabase.from('admin_user').upsert({ uid: '[learner.key]' })
cleanup: supabase.from('admin_user').delete().eq('uid', '[learner.key]')
cleanup: supabase.from('phrase').update({ archived: false }).eq('id', '[team.nocard_phrase]')
cleanup: supabase.from('phrase_translation').update({ archived: false }).eq('phrase_id', '[team.nocard_phrase]')

learner:

- login
- openTo /admin/[team.lang]/phrases/[team.nocard_phrase]
- up
- see admin-phrase-detail
- click admin-archive-button
- seeToast toast-success

# non-admin does not see admin gear icon on phrase page

friend:

- login
- openTo /learn/kan/phrases/[team.nocard_phrase]
- up
- notSee admin-gear-link

# non-admin sees warning on admin page but no admin actions

// A non-admin user navigates directly to the admin phrases page.
// They see a warning that they are not an admin. They can view
// the table and detail page but admin actions are hidden.

friend:

- login
- openTo /admin/kan/phrases
- up
- see admin-phrases-page
- see admin-not-authorized-warning
- see admin-phrases-table
- click admin-phrase-detail-link
- up
- see admin-phrase-detail
- see admin-not-authorized-warning
- notSee admin-archive-button
