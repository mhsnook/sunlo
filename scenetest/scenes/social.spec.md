# learner sends and cancels a friend request

learner:

- login
  // STUB — never implemented; carried over from a skipped legacy spec. To implement:
  // - navigate to friend search / invite
  // - send two friend requests
  // - verify both requests appear on /friends
  // - cancel one request; verify it is gone
  // DB-state agreement belongs in inline serverChecks on the social
  // collections, not in this scene.

# learner3 accepts a friend request and then unfriends

The seed leaves learner's invite to learner3 pending. Accepting it, and then
undoing it, walks the pair through all three statuses. Each button state is
folded from the action log on the client — no `friend_summary` fetch — so this
scene is what proves the fold and the write-back agree with the server.

cleanup: supabase.from('friend_request_action').delete().eq('uid_by', '[learner3.key]').eq('uid_for', '[learner.key]')

learner3:

- login
- openTo /friends/[learner.key]
- see friend-profile-page
- see accept-friend-request-button
- click accept-friend-request-button
- seeToast toast-success
- see friends-status-button
- click friends-status-button
- click unfriend-button
- seeToast toast-neutral
- see add-friend-button

# learner declines or removes a friend

learner:

- login
  // STUB — never implemented; carried over from a skipped legacy spec. To implement:
  // - decline a pending request or remove an existing friend
  // - verify the relationship state updates

# learner sends a recommendation message to a friend

learner:

- login
  // STUB — never implemented; carried over from a skipped legacy spec. To implement:
  // - open the chat with a friend
  // - send a phrase recommendation message
  // - verify the message appears in the thread

# learner sends a phrase request to a friend

learner:

- login
  // STUB — never implemented; carried over from a skipped legacy spec. To implement:
  // - open request creation
  // - send a phrase request addressed to a friend
  // - verify the request is created
