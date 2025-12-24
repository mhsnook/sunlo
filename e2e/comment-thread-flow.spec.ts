import { test, expect } from '@playwright/test'

test('comprehensive request and comment flow', async ({ page }) => {
	// Increase timeout for this long multi-user test
	test.setTimeout(180_000)

	// --- USER 1 ACTIONS ---
	// 1. Log in as User 1 (GarlicFace)
	await page.goto('/learn')

	// Wait for redirection
	await page.waitForTimeout(2000)

	if (page.url().includes('/login')) {
		await page.getByLabel(/Email/i).fill('sunloapp@gmail.com')
		await page.getByLabel(/Password/i).fill('password')
		await page.getByRole('button', { name: /Log in/i }).click()
	}

	await expect(page).toHaveURL(/\/learn/, { timeout: 30000 })
	await expect(page.getByText('Learning Home')).toBeVisible({ timeout: 30000 })

	// 2. Add a new request in Tamil deck
	await page.goto('/learn/tam/requests/new')
	const requestPrompt = `Comprehensive test request - ${Date.now()}`
	const textarea = page.getByTestId('request-prompt-input')
	await expect(textarea).toBeVisible({ timeout: 15000 })
	await textarea.fill(requestPrompt)

	// Click and wait for navigation to the permalink
	await Promise.all([
		page.waitForURL(/\/learn\/tam\/requests\/[0-9a-f-]+/, { timeout: 30000 }),
		page.getByTestId('post-request-button').click(),
	])

	const requestUrl = page.url()
	const requestId = requestUrl.split('/').pop()!
	await expect(page.getByTestId('request-permalink-card')).toHaveAttribute(
		'data-request-id',
		requestId
	)
	await expect(page.getByText(requestPrompt)).toBeVisible()

	// 3. Comment on that request
	await page.getByTestId('add-comment-trigger').click()
	const commentTextarea = page.getByTestId('comment-textarea')
	await commentTextarea.fill('User 1: First comment.')
	await page.getByTestId('post-comment-button').click()
	await expect(page.getByText('Comment posted!')).toBeVisible()
	await expect(page.getByText('User 1: First comment.')).toBeVisible()

	// 4. Add a second comment with a card
	// Sometimes there are multiple triggers (one top level, one per comment), let's find the one in the request card footer
	await page
		.getByTestId('request-permalink-card')
		.getByTestId('add-comment-trigger')
		.click()
	await page
		.getByTestId('comment-textarea')
		.fill('User 1: Comment with a card.')

	await page.getByTestId('open-phrase-picker').click()
	await page.getByTestId('phrase-search-input').fill('onnu')
	await page.waitForTimeout(1000) // Wait for search
	await page.click('button:has-text("onnu")')
	await page.getByTestId('add-selected-phrases-button').click()

	await page.getByTestId('post-comment-button').click()
	await expect(page.getByText('Comment posted!')).toBeVisible()
	await expect(page.getByText('onnu, rendu, moonu')).toBeVisible()

	// 5. Upvote the comment with a card and then remove the upvote
	const commentWithCard = page
		.locator('[data-testid="comment-item"]', { hasText: 'onnu, rendu, moonu' })
		.first()
	const commentUpvoteBtn = commentWithCard
		.locator('button[title^="Vote up"]')
		.first()

	const initialCount = await commentUpvoteBtn.innerText()
	await commentUpvoteBtn.click()
	await expect(commentUpvoteBtn).not.toHaveText(initialCount)

	await commentUpvoteBtn.click()
	await expect(commentUpvoteBtn).toHaveText(initialCount)

	// 6. Edit the first comment
	const firstComment = page
		.locator('[data-testid="comment-item"]', {
			hasText: 'User 1: First comment.',
		})
		.first()
	const comment1Id = await firstComment.getAttribute('data-comment-id')

	await firstComment.locator('button[title="Edit your comment"]').click()
	await page.locator('textarea').fill('User 1: First comment (EDITED).')
	await page.click('button:has-text("Save Changes")')
	await expect(page.getByText('Comment updated!')).toBeVisible()
	await expect(page.getByText('User 1: First comment (EDITED).')).toBeVisible()

	// 7. Delete a third (temp) comment
	await page
		.getByTestId('request-permalink-card')
		.getByTestId('add-comment-trigger')
		.click()
	await page.getByTestId('comment-textarea').fill('Temp delete me')
	await page.getByTestId('post-comment-button').click()
	await expect(page.getByText('Comment posted!')).toBeVisible()

	const tempComment = page
		.locator('[data-testid="comment-item"]', { hasText: 'Temp delete me' })
		.first()
	await tempComment.locator('button[title="Delete your comment"]').click()
	await page.click('button:has-text("Delete Comment")')
	await expect(page.getByText('Comment deleted!')).toBeVisible()

	// 8. Copy URL button
	await page.getByTestId('copy-link-button').click()
	await expect(page.getByText('Link copied to clipboard')).toBeVisible()

	// 9. Share request button
	await page.getByTestId('send-to-friend-button').click()
	await expect(page.getByText('Send this to a friend')).toBeVisible()
	await page.keyboard.press('Escape')
	await expect(page.getByText('Send this to a friend')).not.toBeVisible()

	// --- USER 2 ACTIONS ---
	// 10. Logout and Login as User 2 (Best Frin)
	await page.click('button:has-text("GarlicFace")')
	await page.click('button:has-text("Log out")')

	await page.fill('input[name="email"]', 'sunloapp+1@gmail.com')
	await page.fill('input[name="password"]', 'password')
	await page.click('button[type="submit"]')
	await expect(page).toHaveURL(/\/learn/)

	// 11. Go to the same request
	await page.goto(requestUrl)

	// 12. Confirm NO edit/delete buttons for User 1's comments
	const user1Comment = page
		.locator('[data-testid="comment-item"]', {
			hasText: 'User 1: First comment (EDITED).',
		})
		.first()
	await expect(
		user1Comment.locator('button[title="Edit your comment"]')
	).not.toBeVisible()
	await expect(
		user1Comment.locator('button[title="Delete your comment"]')
	).not.toBeVisible()

	// 13. Upvote them and remove the upvote
	const upvoteBtnOther = user1Comment
		.locator('button[title^="Vote up"]')
		.first()
	const countBeforeOther = await upvoteBtnOther.innerText()
	await upvoteBtnOther.click()
	await expect(upvoteBtnOther).not.toHaveText(countBeforeOther)
	await upvoteBtnOther.click()
	await expect(upvoteBtnOther).toHaveText(countBeforeOther)

	// 14. Reply to them
	await user1Comment.locator('button[title="Add a reply"]').click()
	await page.getByTestId('comment-textarea').fill('User 2: Replying.')
	await page.getByTestId('post-comment-button').click()
	await expect(page.getByText('Reply posted!')).toBeVisible()
	await expect(page.getByText('User 2: Replying.')).toBeVisible()

	// 15. Edit our reply
	const myReply = page
		.locator('[data-testid="comment-item"]', { hasText: 'User 2: Replying.' })
		.first()
	await myReply.locator('button[title="Edit your comment"]').click()
	await page.locator('textarea').fill('User 2: Replying (EDITED).')
	await page.click('button:has-text("Save Changes")')
	await expect(page.getByText('Comment updated!')).toBeVisible()
	await expect(page.getByText('User 2: Replying (EDITED).')).toBeVisible()

	// 16. Top-level comment with linked cards
	await page
		.getByTestId('request-permalink-card')
		.getByTestId('add-comment-trigger')
		.click()
	await page.getByTestId('comment-textarea').fill('User 2: Top level comment.')
	await page.getByTestId('open-phrase-picker').click()
	await page.getByTestId('phrase-search-input').fill('tamil')
	await page.waitForTimeout(1000)
	await page.click('button:has-text("Tamil")')
	await page.getByTestId('add-selected-phrases-button').click()
	await page.getByTestId('post-comment-button').click()
	await expect(page.getByText('Comment posted!')).toBeVisible()

	// 17. Upvote the request
	await page.getByTestId('upvote-request-button').click()

	// 18. Share with a friend
	await page.getByTestId('send-to-friend-button').click()
	await expect(page.getByText('Send this to a friend')).toBeVisible()
})
