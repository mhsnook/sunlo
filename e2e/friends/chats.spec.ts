import { test, expect } from '@playwright/test'
import {
	loginAsTestUser,
	loginAsFirstUser,
	logout,
	TEST_USER_UID,
	FIRST_USER_UID,
} from '../helpers/auth-helpers'
import { supabase } from '../helpers/db-helpers'

// Test users from seed data:
// GarlicFace (sunloapp@gmail.com) - TEST_USER_UID: cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18
// Best Frin (sunloapp+1@gmail.com) - FIRST_USER_UID: a2dfa256-ef7b-41b0-b05a-d97afab8dd21
// Lexigrine (sunloapp+friend@gmail.com) - 7ad846a9-d55b-4035-8be2-dbcc70074f74

const _FRIEND_USER_UID = '7ad846a9-d55b-4035-8be2-dbcc70074f74' // Lexigrine

test.describe.serial('Chat Messages', () => {
	// Store message IDs for cleanup
	const createdMessageIds: string[] = []

	test.afterAll(async () => {
		// Clean up test messages
		let promises = []
		for (const id of createdMessageIds) {
			promises.push(supabase.from('chat_message').delete().eq('id', id))
		}
		try {
			await Promise.all(promises)
		} catch (error) {
			console.log(`Error cleaning up chat messages:`, error)
		}
	})

	test('User can see messages from friends (initial query loads both sent and received)', async ({
		page,
	}) => {
		await loginAsTestUser(page)

		// Navigate to Chats via sidebar
		await page.locator('[data-testid="sidebar-link--friends-chats"]').click()

		// Wait for chats page to load
		await expect(page).toHaveURL('/friends/chats')

		// Find the friend (Best Frin) in the chat list sidebar
		// From seed data: Best Frin (a2dfa256) sent a message to GarlicFace (cf1f69ce)
		// Use href filter to target the chats sidebar link (goes to /friends/chats/$friendUid)
		const friendChatLink = page.locator(
			`a[href*="/friends/chats/"]:has-text("Best Frin")`
		)
		await expect(friendChatLink).toBeVisible()

		// Click to open chat with Best Frin
		await friendChatLink.click()

		// Wait for chat to load
		await expect(page).toHaveURL(/\/friends\/chats\//)

		// The chat should show messages - verify there are some messages visible
		// From seed data, there should be a message from Best Frin to GarlicFace
		const messageArea = page
			.locator('[ref="messagesContainerRef"]')
			.or(page.locator('.space-y-4'))
		await expect(messageArea).toBeVisible()

		// Verify we can see at least one message bubble
		const messageBubbles = page.locator('.rounded-b-2xl')
		const count = await messageBubbles.count()
		expect(count).toBeGreaterThan(0)
	})

	test('User can see chat with friend who sent them messages', async ({
		page,
	}) => {
		// Log in as Best Frin
		await loginAsFirstUser(page)

		// Navigate to Chats
		await page.locator('[data-testid="sidebar-link--friends-chats"]').click()

		await expect(page).toHaveURL('/friends/chats')

		// Look for GarlicFace in the chat list (use href filter to target chat link)
		const garlicFaceChat = page.locator(
			`a[href*="/friends/chats/"]:has-text("GarlicFace")`
		)
		await expect(garlicFaceChat).toBeVisible()

		// Click to open the chat
		await garlicFaceChat.click()

		// Verify we can see messages in the chat
		await expect(page).toHaveURL(/\/friends\/chats\//)

		// Wait for messages to load - there should be messages from seed data
		const messageBubbles = page.locator('.rounded-b-2xl')
		await expect(messageBubbles.first()).toBeVisible()

		const count = await messageBubbles.count()
		expect(count).toBeGreaterThan(0)
	})

	test('Sending a message creates an unread message for recipient', async ({
		page,
	}) => {
		// First, log in as GarlicFace and send a message to Best Frin
		await loginAsTestUser(page)

		// Navigate to Chats
		await page.locator('[data-testid="sidebar-link--friends-chats"]').click()

		await expect(page).toHaveURL('/friends/chats')

		// Create a test message directly in the database to simulate sending
		const { data: message } = await supabase
			.from('chat_message')
			.insert({
				sender_uid: TEST_USER_UID,
				recipient_uid: FIRST_USER_UID,
				message_type: 'recommendation',
				lang: 'hin',
				phrase_id: null,
			})
			.select()
			.single()

		if (message) {
			createdMessageIds.push(message.id)
		}

		// Verify the message was created with read_at = null
		const { data: createdMessage } = await supabase
			.from('chat_message')
			.select('read_at')
			.eq('id', message!.id)
			.single()

		expect(createdMessage?.read_at).toBeNull()

		// Now log out and log in as Best Frin to verify unread badge
		await logout(page)
		await loginAsFirstUser(page)

		// Navigate to Chats
		await page.locator('[data-testid="sidebar-link--friends-chats"]').click()

		// The unread message should be visible - GarlicFace chat should show up with a badge
		// We can verify the chat link exists (use href filter to target chat link)
		const garlicFaceChat = page.locator(
			`a[href*="/friends/chats/"]:has-text("GarlicFace")`
		)
		await expect(garlicFaceChat).toBeVisible()
	})

	test('Opening a chat marks messages as read', async ({ page }) => {
		// Log in as GarlicFace FIRST so collection syncs
		await loginAsTestUser(page)

		// Wait for collections to sync
		await page.waitForLoadState('networkidle')

		// Now create an unread message - realtime subscription will catch it
		const { data: message } = await supabase
			.from('chat_message')
			.insert({
				sender_uid: FIRST_USER_UID,
				recipient_uid: TEST_USER_UID,
				message_type: 'recommendation',
				lang: 'hin',
				phrase_id: null,
			})
			.select()
			.single()

		if (message) {
			createdMessageIds.push(message.id)
		}

		// Small delay for realtime to propagate
		await page.waitForTimeout(500)

		// Navigate to Chats
		await page.getByTestId('sidebar-link--friends-chats').click()

		await expect(page).toHaveURL('/friends/chats')

		// Click on Best Frin's chat (use href filter to target chat link)
		const bestFrinChat = page.locator(
			`a[href*="/friends/chats/"]:has-text("Best Frin")`
		)
		await expect(bestFrinChat).toBeVisible()
		await bestFrinChat.click()

		// Wait for chat page to load
		await expect(page).toHaveURL(/\/friends\/chats\//)

		// Wait for chat content to render (proves collection has synced)
		await expect(page.getByText('Best Frin')).toBeVisible()

		// Wait a bit for the UI to stabilize and mutation to fire
		await page.waitForTimeout(1000)

		// Poll for the message to be marked as read (mutation may take a moment)
		await expect
			.poll(
				async () => {
					const { data: readMessage } = await supabase
						.from('chat_message')
						.select('read_at')
						.eq('id', message!.id)
						.single()
					return readMessage?.read_at
				},
				{ timeout: 10000, intervals: [500, 1000, 1000, 2000, 2000] }
			)
			.not.toBeNull()
	})
})
