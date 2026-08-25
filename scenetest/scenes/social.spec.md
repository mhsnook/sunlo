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

# friend accepts a friend request and removes a friend

friend:

- login
  // STUB — never implemented; carried over from a skipped legacy spec. To implement:
  // - sidebar shows a pending friend request (seed data)
  // - open friend requests and accept the request
  // - verify the new friend appears on /friends
  // - open the friend's profile and unfriend them
  // - verify they are no longer connected

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
