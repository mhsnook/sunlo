import { test, expect } from '@playwright/test'
import { markAllIntrosAffirmed } from './helpers/collection-helpers'

// This test verifies the login flow from a logged-out state
test.use({ storageState: { cookies: [], origins: [] } })

test('login flow redirects and shows content', async ({ page }) => {
	// 1. Navigate to /learn - should now be accessible without login
	await page.goto('/learn')

	// Pre-affirm all intro dialogs to prevent them blocking the test
	await markAllIntrosAffirmed(page)

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

	// 6. Wait for post-login content: either /learn (decks grid) or /welcome page
	const decksGrid = page.getByTestId('decks-list-grid')
	const welcomePage = page.getByTestId('welcome-page')
	await expect(decksGrid.or(welcomePage)).toBeVisible({ timeout: 20000 })

	// 7. If we landed on /welcome, click through to /learn
	if (await welcomePage.isVisible()) {
		await page.getByRole('link', { name: 'Go to My Decks' }).click()
		await expect(page).toHaveURL(/\/learn$/, { timeout: 10000 })
	}

	// 8. Verify the presence of active decks (allow time for collections to load)
	await expect(decksGrid).toBeVisible({ timeout: 10000 })
	expect(await decksGrid.locator('> *').count()).toBeGreaterThanOrEqual(3)
})
