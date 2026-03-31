# learner sees notification bell in navbar

learner:

- login
- openTo /learn
- see decks-list-grid
- see notification-bell

# visitor does not see notification bell

visitor:

- openTo /
- see landing-page
- notSee notification-bell

# learner navigates to notifications page

learner:

- login
- openTo /learn
- see notification-bell
- click notification-bell
- up
- see notifications-page

# learner sees empty state when no notifications

cleanup: supabase.from('notification').delete().eq('uid', '[learner.key]')

learner:

- login
- click notification-bell
- up
- see notifications-empty-state
- seeText No notifications yet

# learner sees unread notifications after someone comments on their request

setup: supabase.from('notification').insert({ uid: '[learner.key]', actor_uid: '[friend.key]', type: 'request_commented', request_id: '3f8c9e2a-1234-4567-89ab-cdef01234567', created_at: new Date().toISOString() })
cleanup: supabase.from('notification').delete().eq('uid', '[learner.key]').eq('type', 'request_commented')

learner:

- login
- see notification-bell
- see notification-badge
- click notification-bell
- up
- see notifications-page
- see notification-item

# learner marks a single notification as read

setup: supabase.from('notification').insert({ uid: '[learner.key]', actor_uid: '[friend.key]', type: 'request_commented', request_id: '3f8c9e2a-1234-4567-89ab-cdef01234567', created_at: new Date().toISOString() })
cleanup: supabase.from('notification').delete().eq('uid', '[learner.key]').eq('type', 'request_commented')

learner:

- login
- click notification-bell
- up
- see notification-item
- click notification-item
- up
- notSee notification-badge

# learner marks all notifications as read

setup: supabase.from('notification').insert([{ uid: '[learner.key]', actor_uid: '[friend.key]', type: 'request_commented', request_id: '3f8c9e2a-1234-4567-89ab-cdef01234567', created_at: new Date().toISOString() }, { uid: '[learner.key]', actor_uid: '[learner2.key]', type: 'request_upvoted', request_id: '3f8c9e2a-1234-4567-89ab-cdef01234567', created_at: new Date().toISOString() }])
cleanup: supabase.from('notification').delete().eq('uid', '[learner.key]')

learner:

- login
- click notification-bell
- up
- see notifications-page
- click mark-all-read-button
- up
- notSee notification-badge
- seeText Earlier

# learner receives different notification types

// Verifies that comment_replied, phrase_translated, phrase_referenced, and request_upvoted
// all render correctly with appropriate icons and action text

setup: supabase.from('notification').insert([{ uid: '[learner.key]', actor_uid: '[friend.key]', type: 'comment_replied', comment_id: 'c0000001-1111-2222-3333-444444444444', request_id: 'e0d3a74e-4fe7-43c0-aa35-d05c83929986', created_at: new Date().toISOString() }, { uid: '[learner.key]', actor_uid: '[learner2.key]', type: 'phrase_translated', phrase_id: '0e33be07-6d4a-4c99-8282-921038188cbf', created_at: new Date().toISOString() }, { uid: '[learner.key]', actor_uid: '[learner3.key]', type: 'request_upvoted', request_id: '3f8c9e2a-1234-4567-89ab-cdef01234567', created_at: new Date().toISOString() }])
cleanup: supabase.from('notification').delete().eq('uid', '[learner.key]')

learner:

- login
- click notification-bell
- up
- see notifications-page
- seeText replied to your comment
- seeText added a translation to your phrase
- seeText upvoted your request
