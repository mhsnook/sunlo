/**
 * Friend Request Flow - Multi-actor test example
 *
 * This test demonstrates the actor-based testing framework for scenarios
 * that involve multiple users interacting with each other in real-time.
 */
import { test } from '@playwright/test'
import { createActors } from '../helpers/actors'
import { supabase } from '../helpers/db-helpers'

test.describe('Friend Request Flow', () => {
	// Track created records for cleanup
	const createdFriendRequestIds: string[] = []

	test.afterAll(async () => {
		// Clean up test friend requests
		for (const id of createdFriendRequestIds) {
			await supabase.from('friend_request_action').delete().eq('id', id)
		}
	})

	test('user can send and receive friend request', async ({ browser }) => {
		const { actors, cleanup } = await createActors({ browser }, 2)
		const [user1, user2] = actors

		try {
			// Both users log in
			await user1.login()
			await user2.login()

			// User1 searches for User2 and sends a friend request
			await user1.openBrowserTo('/friends')
			await user1.clickId('search-users-button').fire()

			// Search for user2's username
			await user1
				.fillId('user-search-input', user2.username)
				.clickId('search-submit')
				.thenSeeId(`user-result-${user2.id}`)
				.clickId('send-friend-request')
				.fire()

			// Verify request was sent successfully
			await user1.seeText(/request sent/i).fire()

			// User2 should see the friend request notification
			await user2.openBrowserTo('/friends')
			await user2
				.seeId('pending-requests-section')
				.thenSeeId(`friend-request-${user1.id}`)
				.clickId('accept-request')
				.fire()

			// Verify both users now see each other as friends
			await user1.openBrowserTo('/friends')
			await user1.seeText(user2.username).fire()

			await user2.seeText(user1.username).fire()
		} finally {
			await cleanup()
		}
	})

	test('coordinated friend request with message bus', async ({ browser }) => {
		const { actors, cleanup } = await createActors({ browser }, 2)
		const [user1, user2] = actors

		try {
			// Both users log in
			await Promise.all([user1.login(), user2.login()])

			// Set up coordination: when user2 sees request, they'll accept
			user2.watchFor('friend request sent', async (actor) => {
				await actor.openBrowserTo('/friends')
				await actor
					.seeId('pending-requests-section')
					.thenSeeId(`friend-request-${user1.id}`)
					.clickId('accept-request')
					.fireAndEmit('friend request accepted')
			})

			// User1 sends request and signals
			await user1.openBrowserTo('/friends')
			await user1.clickId('search-users-button').fire()
			await user1
				.fillId('user-search-input', user2.username)
				.clickId('search-submit')
				.thenSeeId(`user-result-${user2.id}`)
				.clickId('send-friend-request')
				.fireAndEmit('friend request sent')

			// Wait for user2 to accept
			await user1.waitForMessage('friend request accepted')

			// Verify user1 sees the new friend
			await user1.openBrowserTo('/friends')
			await user1.seeText(user2.username).fire()
		} finally {
			await cleanup()
		}
	})

	test('chat message exchange between friends', async ({ browser }) => {
		const { actors, cleanup } = await createActors({ browser }, 2)
		const [user1, user2] = actors

		try {
			await Promise.all([user1.login(), user2.login()])

			// Navigate to existing chat (assumes users are already friends from seed)
			await user1.openBrowserTo(`/friends/chats/${user2.id}`)
			await user1
				.seeId('chat-container')
				.fillId('message-input', 'Hello from user1!')
				.clickId('send-message')
				.fire()

			// User2 checks their chat and sees the message
			await user2.openBrowserTo(`/friends/chats/${user1.id}`)
			await user2.seeText('Hello from user1!').fire()

			// User2 responds
			await user2
				.fillId('message-input', 'Hey user1, nice to chat!')
				.clickId('send-message')
				.fire()

			// User1 sees the response (may need to refresh or wait for realtime)
			await user1.page.reload()
			await user1.seeText('Hey user1, nice to chat!').fire()
		} finally {
			await cleanup()
		}
	})
})

/**
 * Example: Using the declarative watchFor pattern
 *
 * This is closer to the original syntax requested in the issue:
 *
 * ```ts
 * const [user1, user2] = actors()
 *
 * // Register callback before action happens
 * user1.watchFor(
 *   () => user1.thenSeeId('alert-new-friend-confirmed'),
 *   'user2 accepts request',
 * )
 *
 * user2
 *   .thenSeeId('alert-new-friend-request')
 *   .clickId('button-goto')
 *   .thenSeeId('friend-management-page-container')
 *   .getById(`friend-item-${user1.id}`)
 *   .clickId('accept-friend')
 *   .fire()
 *
 * user1.watchFor(
 *   'user2 accepts request',
 *   async (actor) =>
 *     actor.clickLink('a')
 *       .thenSeeId('friend-management-page-container')
 *       .thenSeeId('friends-list-container')
 *       .thenReadText(user2.username)
 *       .fire()
 * )
 * ```
 */
