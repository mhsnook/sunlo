import { test, expect } from '@playwright/test'
import { getTestUserForProject } from '../helpers/auth-helpers'
import { goToLearnPage } from '../helpers/goto-helpers'
import { TEST_LANG, TEST_LANG_DISPLAY } from '../helpers/test-constants'

test.describe('Logged In Navigation', () => {
	test.beforeEach(async ({ page }) => {
		await goToLearnPage(page)
		await expect(
			page.getByTestId('decks-list-grid').getByText(TEST_LANG_DISPLAY)
		).toBeVisible({ timeout: 10000 })
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

		// Should see review content - either setup page or continue review page
		await expect(
			page
				.getByTestId('review-setup-page')
				.or(page.getByRole('button', { name: /continue review/i }))
		).toBeVisible({ timeout: 10000 })
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

	test('can switch between decks', async ({ page }) => {
		await page
			.getByTestId('decks-list-grid')
			.getByText(TEST_LANG_DISPLAY)
			.click()
		await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}`))

		// Navigate back to deck list via the deck switcher dropdown
		if (!(await page.getByTestId('all-decks-link').isVisible())) {
			await page.getByTestId('deck-switcher-button').click()
		}
		await page.getByTestId('all-decks-link').click()
		await expect(page).toHaveURL('/learn')

		// Now go to Spanish if available
		const spanishLink = page.getByText('Spanish')
		if ((await spanishLink.count()) > 0) {
			await spanishLink.click()
			await expect(page).toHaveURL(/\/learn\/spa/)
		}
	})

	test('search modal opens from deck nav', async ({ page }) => {
		await page
			.getByTestId('decks-list-grid')
			.getByText(TEST_LANG_DISPLAY)
			.click()

		// Click search icon button in the app nav
		await page.getByTestId('navbar-search-button').click()

		// Search overlay modal should be visible
		await expect(page.getByTestId('browse-search-overlay')).toBeVisible()
	})

	test('search functionality works in modal', async ({ page }) => {
		await page
			.getByTestId('decks-list-grid')
			.getByText(TEST_LANG_DISPLAY)
			.click()

		// Open search modal
		await page.getByTestId('navbar-search-button').click()
		await expect(page.getByTestId('browse-search-overlay')).toBeVisible()

		// Find search input inside the modal
		const searchInput = page.getByTestId('browse-search-input')
		await expect(searchInput).toBeVisible()

		// Type a search term
		await searchInput.fill('hello')

		// Wait a moment for debounce
		await page.waitForTimeout(500)

		// Modal should still be open and functional
		await expect(page.getByTestId('browse-search-overlay')).toBeVisible()
	})
})
