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

const FRIEND_USER_UID = '7ad846a9-d55b-4035-8be2-dbcc70074f74' // Lexigrine

test.describe.serial('Chat Messages', () => {
	// Store message IDs for cleanup
	const createdMessageIds: string[] = []

	test.afterAll(async () => {
		// Clean up test messages
		for (const id of createdMessageIds) {
			await supabase.from('chat_message').delete().eq('id', id)
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

		// Find the friend (Best Frin) in the chat list
		// From seed data: Best Frin (a2dfa256) sent a message to GarlicFace (cf1f69ce)
		const friendChatLink = page.getByRole('link', { name: /Best Frin/i })
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

		// Look for GarlicFace in the chat list
		const garlicFaceChat = page.getByRole('link', { name: /GarlicFace/i })
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

		// Open chat with Best Frin
		await page.getByRole('link', { name: /Best Frin/i }).click()
		await expect(page).toHaveURL(/\/friends\/chats\//)

		// Click the "Send a phrase recommendation..." link/input to open recommendation modal
		await page.getByPlaceholder('Send a phrase recommendation').click()

		// Wait for the recommendation modal to appear
		await expect(page).toHaveURL(/\/recommend/)

		// Select a phrase to send (from the list)
		// Wait for phrases to load and select the first one
		const phraseCards = page.locator('[data-testid^="phrase-card-"]')
		await expect(phraseCards.first()).toBeVisible({ timeout: 10000 })
		await phraseCards.first().click()

		// Click the send button
		await page.getByRole('button', { name: /send/i }).click()

		// Wait for success toast
		await expect(page.getByText(/sent/i)).toBeVisible()

		// Get the message ID from DB for cleanup
		const { data: messages } = await supabase
			.from('chat_message')
			.select('id')
			.eq('sender_uid', TEST_USER_UID)
			.eq('recipient_uid', FIRST_USER_UID)
			.order('created_at', { ascending: false })
			.limit(1)

		if (messages?.[0]?.id) {
			createdMessageIds.push(messages[0].id)
		}

		// Log out
		await logout(page)

		// Log in as Best Frin
		await loginAsFirstUser(page)

		// Navigate to Chats - should see unread badge
		const chatsLink = page.locator(
			'[data-testid="sidebar-link--friends-chats"]'
		)
		await expect(chatsLink).toBeVisible()

		// Check for unread badge on the Chats link
		// The badge should show the number of friends with unread messages
		const chatsBadge = chatsLink.locator('span').filter({ hasText: /^\d+$/ })
		await expect(chatsBadge).toBeVisible({ timeout: 5000 })
	})

	test('Viewing chat marks messages as read and clears badge', async ({
		page,
	}) => {
		// Log in as Best Frin (who has unread messages from GarlicFace)
		await loginAsFirstUser(page)

		// Navigate to Chats
		await page.locator('[data-testid="sidebar-link--friends-chats"]').click()
		await expect(page).toHaveURL('/friends/chats')

		// The sidebar should show GarlicFace with an unread badge
		const garlicFaceChatLink = page.getByRole('link', { name: /GarlicFace/i })
		await expect(garlicFaceChatLink).toBeVisible()

		// Check for unread badge on GarlicFace's chat
		const friendUnreadBadge = garlicFaceChatLink.locator('span').filter({
			hasText: /^\d+$/,
		})
		const hasBadge = await friendUnreadBadge.isVisible()

		// Click to view the chat
		await garlicFaceChatLink.click()
		await expect(page).toHaveURL(/\/friends\/chats\//)

		// Wait for messages to load
		await expect(page.locator('.rounded-b-2xl').first()).toBeVisible()

		// After viewing, the badge should be gone (messages marked as read)
		if (hasBadge) {
			// Navigate away and back to verify badge is cleared
			await page.locator('[data-testid="sidebar-link--friends-chats"]').click()

			// The badge on GarlicFace's chat should now be gone
			const refreshedChatLink = page.getByRole('link', {
				name: /GarlicFace/i,
			})
			await expect(refreshedChatLink).toBeVisible()

			// Badge should not be visible now
			const clearedBadge = refreshedChatLink.locator('span').filter({
				hasText: /^\d+$/,
			})
			await expect(clearedBadge).not.toBeVisible()
		}
	})
})
