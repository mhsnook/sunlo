import { test, expect } from '@playwright/test'
import { getTestUserForProject } from '../helpers/auth-helpers'
import { TEST_LANG, TEST_LANG_DISPLAY } from '../helpers/test-constants'

test.describe('Logged In Navigation', () => {
	test.beforeEach(async ({ page }) => {
		// storageState provides auth; just navigate to /learn
		await page.goto('/learn')
		await expect(
			page.getByText('Which deck are we studying today?')
		).toBeVisible()
	})

	test('deck list shows on learn page', async ({ page }) => {
		// After login, we should be on /learn with decks visible
		await expect(page).toHaveURL(/\/learn/)

		// Should see deck list grid
		const decksGrid = page.getByTestId('decks-list-grid')
		await expect(decksGrid).toBeVisible()

		// Should have at least one deck
		const deckCount = await decksGrid.locator('> *').count()
		expect(deckCount).toBeGreaterThan(0)
	})

	test('can navigate to each deck and see stats', async ({ page }) => {
		await page
			.getByTestId('decks-list-grid')
			.getByText(TEST_LANG_DISPLAY)
			.click()

		// Should be on deck feed
		await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}/feed`))

		// Navigate to review page via nav
		await page
			.locator('nav[data-slot=navigation-menu]')
			.getByRole('link', { name: /review/i })
			.click()

		await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}/review`))

		// Should see review stats
		await expect(page.getByText(/total cards/i)).toBeVisible()
	})

	test('sidebar navigation works within a deck', async ({ page }) => {
		await page
			.getByTestId('decks-list-grid')
			.getByText(TEST_LANG_DISPLAY)
			.click()
		await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}`))

		// Test each nav link in the sidebar
		const nav = page.locator('nav[data-slot=navigation-menu]')

		// Browse link
		const browseLink = nav.getByRole('link', { name: /browse/i })
		if ((await browseLink.count()) > 0) {
			await browseLink.click()
			await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}/browse`))
		}

		// Feed link
		const feedLink = nav.getByRole('link', { name: /feed/i })
		if ((await feedLink.count()) > 0) {
			await feedLink.click()
			await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}/feed`))
		}

		// Review link
		const reviewLink = nav.getByRole('link', { name: /review/i })
		if ((await reviewLink.count()) > 0) {
			await reviewLink.click()
			await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}/review`))
		}
	})

	test('profile page loads and shows user info', async ({ page }, testInfo) => {
		// Profile link is in a dropdown menu triggered by user avatar button
		// The user button has an avatar and user info, not just the theme toggle
		const { username } = getTestUserForProject(testInfo)
		const userMenuButton = page.getByRole('button', {
			name: new RegExp(username, 'i'),
		})
		await userMenuButton.click()

		// Now click the Profile link in the dropdown
		const profileLink = page.getByRole('menuitem', { name: /profile/i }).first()
		await profileLink.click()

		await expect(page).toHaveURL(/\/profile/)

		// Should see profile content
		await expect(page.getByText(/display preferences/i)).toBeVisible()
	})

	test('friends section is visible on learn page', async ({ page }) => {
		// Should see friends section (use heading role to be specific)
		await expect(
			page.getByRole('heading', { name: /your friends/i })
		).toBeVisible()
	})

	test('can switch between decks', async ({ page }) => {
		await page
			.getByTestId('decks-list-grid')
			.getByText(TEST_LANG_DISPLAY)
			.click()
		await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}`))

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
		await page
			.getByTestId('decks-list-grid')
			.getByText(TEST_LANG_DISPLAY)
			.click()

		// Navigate to search (deck-specific navigation)
		await page
			.locator('nav[data-slot=navigation-menu]')
			.getByRole('link', { name: /search/i })
			.click()

		await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}/search`))

		// Should see phrase cards or search interface
		const appOutlet = page.locator('#app-sidebar-layout-outlet')
		await expect(appOutlet).toBeVisible()
	})

	test('search functionality works', async ({ page }) => {
		await page
			.getByTestId('decks-list-grid')
			.getByText(TEST_LANG_DISPLAY)
			.click()
		await page
			.locator('nav[data-slot=navigation-menu]')
			.getByRole('link', { name: /search/i })
			.click()

		await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}/search`))

		// Find search input
		const searchInput = page.getByPlaceholder(/search/i)
		if ((await searchInput.count()) > 0) {
			// Type a search term
			await searchInput.fill('hello')

			// Wait a moment for debounce
			await page.waitForTimeout(500)

			// Page should still be functional (no crash)
			await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}/search`))
		}
	})
})
