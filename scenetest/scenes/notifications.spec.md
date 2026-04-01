# learner sees notification bell in navbar

learner:

- login
- openTo /learn
- up
- see notification-bell

# visitor does not see notification bell

visitor:

- openTo /
- see landing-page
- notSee notification-bell

# learner navigates to notifications page

learner:

- login
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

// Note: Scenes that test unread badges, mark-as-read, and notification types
// require `setup:` directives to insert notifications, which scenetest does
// not yet support. These scenes are tracked in the testing plan as future work.
// They can also be tested end-to-end by chaining with the comments spec
// (friend comments → learner sees notification).
