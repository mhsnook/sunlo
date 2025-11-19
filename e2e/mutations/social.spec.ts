import { test } from '@playwright/test'
import { loginAsTestUser } from '../helpers/auth-helpers'

test.describe.serial('Social and Friend Mutations', () => {
	test.skip('useFriendRequestAction: send/cancel friend request', async ({
		page,
	}) => {
		await loginAsTestUser(page)
		// TODO: Implement send friend request test
		// Navigate to friend search/invite
		// Send 2 friend requests
		// Verify requests in DB
		// Navigate to /friends, verify 2 requests on the page
		// Cancel one request
		// Verify request cancelled on the friend_summary view in DB
		// Verify FriendSummarySchema parsing works
	})

	test.skip('useFriendRequestAction: accept friend request, remove friend', async ({
		page,
	}) => {
		await loginAsSecondUser(page)
		// TODO: Implement accept friend request test
		// Sidebar should show pending friend request (because of seed data)
		// Navigate to friend requests
		// Should see one request, accept it
		// Verify friend status updated in DB
		// Visit /friends, should see new friend
		// Visit friend's profile
		// Unfriend, confirm unconnected in friend_summary view in DB
	})

	test.skip('useFriendRequestAction: decline/remove friend', async ({
		page,
	}) => {
		await loginAsTestUser(page)
		// TODO: Implement decline/remove friend test
		// Decline a request or remove a friend
		// Verify status in DB
	})

	test.skip('sendMessageMutation: send recommendation message', async ({
		page,
	}) => {
		await loginAsTestUser(page)
		// TODO: Implement send message test
		// Navigate to chat with friend
		// Send a recommendation message
		// Verify message in DB
	})

	test.skip('sendRequestToFriendMutation: send phrase request', async ({
		page,
	}) => {
		await loginAsTestUser(page)
		// TODO: Implement phrase request test
		// Navigate to request creation
		// Send request to friend
		// Verify request in DB
	})
})
