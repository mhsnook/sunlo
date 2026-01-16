import { test, expect } from '@playwright/test'

test('login flow redirects and shows content', async ({ page }) => {
	// 1. Navigate to /learn - should now be accessible without login
	await page.goto('/learn')

	// 2. Verify we can see the page (no redirect to login)
	await expect(page).toHaveURL(/\/learn/)

	// 3. Verify the sidebar shows login/signup options for unauthenticated users
	await expect(page.getByRole('link', { name: 'Log in' }).first()).toBeVisible()

	// 4. Navigate to login page and log in
	await page.getByRole('link', { name: 'Log in' }).first().click()
	await expect(page).toHaveURL(/\/login/)
	await expect(
		page.getByRole('heading', { name: 'Please log in' })
	).toBeVisible()

	// 5. Log in with "sunloapp@gmail.com" and "password"
	await page.fill('input[name="email"]', 'sunloapp@gmail.com')
	await page.fill('input[name="password"]', 'password')
	await page.click('button[type="submit"]')

	// 6. Expect redirection back to /learn
	await expect(page).toHaveURL(/\/learn/)

	// 7. Verify the presence of 3 active decks and 2 friends
	await expect(page.getByText('Your friends').first()).toBeVisible()

	// Assert 3 active decks
	const decksGrid = page.locator('#decks-list-grid')
	await expect(decksGrid).toBeVisible()
	expect(await decksGrid.locator('> div').count()).toBeGreaterThanOrEqual(3)

	// Assert at least 1 friend
	await expect(page.getByText('Your friends')).toBeVisible()
	const friendsCardElement = page.locator('.border', {
		hasText: 'Your friends',
	})
	const friendCount = await friendsCardElement
		.locator('.space-y-2 > div')
		.count()
	expect(friendCount).toBeGreaterThanOrEqual(1)
})
