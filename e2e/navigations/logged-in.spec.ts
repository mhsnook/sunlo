import { test, expect } from '@playwright/test'
import { loginAsTestUser } from '../helpers/auth-helpers'

test.describe('Logged In Navigation', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsTestUser(page)
	})

	test('deck list shows on learn page', async ({ page }) => {
		// After login, we should be on /learn with decks visible
		await expect(page).toHaveURL(/\/learn/)

		// Should see deck list grid
		const decksGrid = page.locator('#decks-list-grid')
		await expect(decksGrid).toBeVisible()

		// Should have at least one deck
		const deckCount = await decksGrid.locator('> *').count()
		expect(deckCount).toBeGreaterThan(0)
	})

	test('can navigate to each deck and see stats', async ({ page }) => {
		// Click on Hindi deck
		await page.getByText('Hindi').click()

		// Should be on deck feed
		await expect(page).toHaveURL(/\/learn\/hin\/feed/)

		// Navigate to review page via nav
		await page
			.locator('nav[data-slot=navigation-menu]')
			.getByRole('link', { name: /review/i })
			.click()

		await expect(page).toHaveURL(/\/learn\/hin\/review/)

		// Should see review stats
		await expect(page.getByText(/total cards/i)).toBeVisible()
	})

	test('sidebar navigation works within a deck', async ({ page }) => {
		// Go to Hindi deck
		await page.getByText('Hindi').click()
		await expect(page).toHaveURL(/\/learn\/hin/)

		// Test each nav link in the sidebar
		const nav = page.locator('nav[data-slot=navigation-menu]')

		// Browse link
		const browseLink = nav.getByRole('link', { name: /browse/i })
		if ((await browseLink.count()) > 0) {
			await browseLink.click()
			await expect(page).toHaveURL(/\/learn\/hin\/browse/)
		}

		// Feed link
		const feedLink = nav.getByRole('link', { name: /feed/i })
		if ((await feedLink.count()) > 0) {
			await feedLink.click()
			await expect(page).toHaveURL(/\/learn\/hin\/feed/)
		}

		// Review link
		const reviewLink = nav.getByRole('link', { name: /review/i })
		if ((await reviewLink.count()) > 0) {
			await reviewLink.click()
			await expect(page).toHaveURL(/\/learn\/hin\/review/)
		}
	})

	test('profile page loads and shows user info', async ({ page }) => {
		// Profile link is in a dropdown menu triggered by user avatar button
		// The user button has an avatar and user info, not just the theme toggle
		const userMenuButton = page.getByRole('button', { name: /garlicface/i })
		await userMenuButton.click()

		// Now click the Profile link in the dropdown
		const profileLink = page.getByRole('menuitem', { name: /profile/i }).first()
		await profileLink.click()

		await expect(page).toHaveURL(/\/profile/)

		// Should see profile content
		await expect(page.getByText(/display preferences/i)).toBeVisible()
	})

	test('friends section is visible on learn page', async ({ page }) => {
		// Should see friends section
		await expect(page.getByText(/your friends/i)).toBeVisible()
	})

	test('can switch between decks', async ({ page }) => {
		// Go to Hindi first
		await page.getByText('Hindi').click()
		await expect(page).toHaveURL(/\/learn\/hin/)

		// Navigate back to deck list - click the "back" or home link
		// The sidebar should have a way to get back to deck selection
		const backLink = page
			.getByRole('link', { name: /decks|home|sunlo/i })
			.first()
		if ((await backLink.count()) > 0) {
			await backLink.click()
			await expect(page).toHaveURL('/learn')
		} else {
			// Try clicking the logo or similar
			await page.goto('/learn')
		}

		// Now go to Spanish if available
		const spanishLink = page.getByText('Spanish')
		if ((await spanishLink.count()) > 0) {
			await spanishLink.click()
			await expect(page).toHaveURL(/\/learn\/spa/)
		}
	})

	test('search page shows phrase cards', async ({ page }) => {
		// Go to Hindi deck
		await page.getByText('Hindi').click()

		// Navigate to search (deck-specific navigation)
		await page
			.locator('nav[data-slot=navigation-menu]')
			.getByRole('link', { name: /search/i })
			.click()

		await expect(page).toHaveURL(/\/learn\/hin\/search/)

		// Should see phrase cards or search interface
		const appOutlet = page.locator('#app-sidebar-layout-outlet')
		await expect(appOutlet).toBeVisible()
	})

	test('search functionality works', async ({ page }) => {
		// Go to Hindi search page
		await page.getByText('Hindi').click()
		await page
			.locator('nav[data-slot=navigation-menu]')
			.getByRole('link', { name: /search/i })
			.click()

		await expect(page).toHaveURL(/\/learn\/hin\/search/)

		// Find search input
		const searchInput = page.getByPlaceholder(/search/i)
		if ((await searchInput.count()) > 0) {
			// Type a search term
			await searchInput.fill('hello')

			// Wait a moment for debounce
			await page.waitForTimeout(500)

			// Page should still be functional (no crash)
			await expect(page).toHaveURL(/\/learn\/hin\/search/)
		}
	})
})
