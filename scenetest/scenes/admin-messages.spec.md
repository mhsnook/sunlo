# admin sees /admin/messages page with the seeded tag filter strip

// All nine starter tags are seeded by 20260526120000_request_messages_and_tags.sql,
// so the strip should always have at least one chip and the "Day 1" tag in particular.

setup: supabase.from('admin_user').upsert({ uid: '[learner.key]' })
cleanup: supabase.from('admin_user').delete().eq('uid', '[learner.key]')

learner:

- login
- openTo /admin/messages
- up
- see admin-messages-page
- see admin-messages-tags-strip
- see tag-filter-all
- see admin-messages-tags-strip day-1
- notSee admin-not-authorized-warning

# non-admin sees the warning on /admin/messages

friend:

- login
- openTo /admin/messages
- up
- see admin-messages-page
- see admin-not-authorized-warning

# admin sees the gear on a request page and lands on the admin request detail

setup: supabase.from('admin_user').upsert({ uid: '[learner.key]' })
cleanup: supabase.from('admin_user').delete().eq('uid', '[learner.key]')

learner:

- login
- openTo /learn/[team.lang_full]/requests/[team.full_request_for_comments]
- up
- see request-detail-page
- see admin-request-gear-link
- click admin-request-gear-link
- up
- see admin-request-detail
- see admin-request-message-section

# non-admin does not see the request gear icon

friend:

- login
- openTo /learn/[team.lang_full]/requests/[team.full_request_for_comments]
- up
- see request-detail-page
- notSee admin-request-gear-link

# admin opens the Edit tags dialog and sees the seeded vocabulary

setup: supabase.from('admin_user').upsert({ uid: '[learner.key]' })
cleanup: supabase.from('admin_user').delete().eq('uid', '[learner.key]')

learner:

- login
- openTo /admin/messages
- up
- see admin-messages-page
- click edit-tags-button
- up
- see edit-tags-list
- see edit-tags-list day-1
- see edit-tags-list introductions

# admin appnav exposes the Messages tab from the per-language admin views

setup: supabase.from('admin_user').upsert({ uid: '[learner.key]' })
cleanup: supabase.from('admin_user').delete().eq('uid', '[learner.key]')

learner:

- login
- openTo /admin/[team.lang_full]/requests
- up
- see appnav-messages
- click appnav-messages
- up
- see admin-messages-page
