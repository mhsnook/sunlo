import { test, expect } from '@playwright/test'

test('login flow redirects and shows content', async ({ page }) => {
	// 1. Navigate to /learn
	await page.goto('/learn')

	// 2. Expect automatic redirection to the login page
	await expect(page).toHaveURL(/\/login/)
	await expect(
		page.getByRole('heading', { name: 'Please log in' })
	).toBeVisible()

	// 3. Log in with "sunloapp@gmail.com" and "password"
	await page.fill('input[name="email"]', 'sunloapp@gmail.com')
	await page.fill('input[name="password"]', 'password')
	await page.click('button[type="submit"]')

	// 4. Expect redirection back to /learn
	await expect(page).toHaveURL(/\/learn/)

	// 5. Verify the presence of 3 active decks and 2 friends
	await expect(page.getByText('Your friends')).toBeVisible()

	// Assert 3 active decks
	const decksGrid = page.locator('#decks-list-grid')
	await expect(decksGrid).toBeVisible()
	expect(await decksGrid.locator('> div').count()).toBeGreaterThanOrEqual(3)

	// Assert 2 friends
	await expect(page.getByText('Your friends')).toBeVisible()
	const friendsCardElement = page.locator('.border', {
		hasText: 'Your friends',
	})
	await expect(friendsCardElement.locator('.space-y-2 > div')).toHaveCount(2)
})
