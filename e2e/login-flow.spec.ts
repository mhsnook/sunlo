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

	// 6. Wait for redirect after login to settle — we'll land on either
	//    /learn (done), /learn/$lang/* (returning user), or /getting-started (new user)
	const decksGrid = page.getByTestId('decks-list-grid')
	const goToDecksButton = page.getByRole('link', { name: 'Go to My Decks' })
	await expect(decksGrid.or(goToDecksButton)).toBeVisible({ timeout: 15000 })

	// 7. If we're on welcome/getting-started, click through to /learn
	if (await goToDecksButton.isVisible()) {
		await goToDecksButton.click()
	}

	// 8. Wait for /learn page to load
	await expect(page).toHaveURL(/\/learn/, { timeout: 10000 })

	// 9. Verify the presence of active decks and friends
	await expect(page.getByText('Your friends').first()).toBeVisible()

	// Assert at least some decks
	await expect(decksGrid).toBeVisible()
	expect(await decksGrid.locator('> *').count()).toBeGreaterThanOrEqual(3)

	// Assert at least 1 friend
	const friendsSection = page.getByTestId('friends-section')
	await expect(friendsSection).toBeVisible()
	await expect(friendsSection.getByText('Your friends')).toBeVisible()
})
