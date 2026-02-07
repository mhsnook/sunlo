import { test, expect } from '@playwright/test'
import { getTestUserForProject } from '../helpers/auth-helpers'
import { deleteMostRecentReviewState } from '../helpers/db-helpers'
import { TEST_LANG, TEST_LANG_DISPLAY } from '../helpers/test-constants'

test.describe('Deck Workflow Navigation', () => {
	test.beforeEach(async ({ page }) => {
		// storageState provides auth; just navigate to /learn
		await page.goto('/learn')
		await expect(
			page.getByText('Which deck are we studying today?')
		).toBeVisible()
	})

	test('review setup page loads with stats', async ({ page }) => {
		await page
			.getByTestId('decks-list-grid')
			.getByText(TEST_LANG_DISPLAY)
			.click()

		// Navigate to review using data-testid
		await page.getByTestId('appnav-review').click()

		await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}/review`))

		// Wait for page content to load - should see either setup or continue
		// Either "Scheduled" heading (fresh) or "Continue Review" button (existing session)
		await expect(
			page
				.getByRole('heading', { name: /scheduled/i })
				.or(page.getByRole('button', { name: /continue review/i }))
				.or(page.getByRole('button', { name: /start.*review/i }))
				.first()
		).toBeVisible({ timeout: 10000 })
	})

	test('can click through to review without submitting', async ({
		page,
	}, testInfo) => {
		const { uid } = getTestUserForProject(testInfo)

		await page
			.getByTestId('decks-list-grid')
			.getByText(TEST_LANG_DISPLAY)
			.click()

		// Navigate to review using data-testid
		await page.getByTestId('appnav-review').click()

		// Start or continue review button should be visible
		const startButton = page.getByRole('button', {
			name: /start.*review|continue.*review/i,
		})
		await expect(startButton).toBeVisible()
		await startButton.click()

		// Should be on review/go page
		await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}/review/go`))

		// Should see a card
		await expect(page.getByText(/card \d+ of \d+/i)).toBeVisible()

		// DON'T click any review buttons - just verify the page loaded
		// Navigate away without submitting - use the back button (review page has no appnav)
		await page.getByTestId('navbar-back').click()

		await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}`))

		// Clean up the review state record created by starting the review
		await deleteMostRecentReviewState(uid, TEST_LANG)
	})

	test('search page loads from deck nav', async ({ page }) => {
		await page
			.getByTestId('decks-list-grid')
			.getByText(TEST_LANG_DISPLAY)
			.click()
		await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}`))

		// Click search in nav using data-testid
		await page.getByTestId('appnav-search').click()

		await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}/search`))
	})

	test('feed page loads with content', async ({ page }) => {
		await page
			.getByTestId('decks-list-grid')
			.getByText(TEST_LANG_DISPLAY)
			.click()

		// Should be on feed by default
		await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}/feed`))

		// Feed should have content visible in the app outlet
		const appOutlet = page.locator('#app-sidebar-layout-outlet')
		await expect(appOutlet).toBeVisible()

		// Check for feed tabs if they exist
		const recentTab = page.getByRole('tab', { name: /recent/i })
		if ((await recentTab.count()) > 0) {
			await expect(recentTab).toBeVisible()
		}
	})

	test('feed tabs switch content', async ({ page }) => {
		await page
			.getByTestId('decks-list-grid')
			.getByText(TEST_LANG_DISPLAY)
			.click()
		await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}/feed`))

		// Try switching tabs if they exist
		const tabs = page.getByRole('tablist')
		if ((await tabs.count()) > 0) {
			const popularTab = page.getByRole('tab', { name: /popular/i })
			if ((await popularTab.count()) > 0) {
				await popularTab.click()
				// Page should still work
				await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}/feed`))
			}

			const recentTab = page.getByRole('tab', { name: /recent/i })
			if ((await recentTab.count()) > 0) {
				await recentTab.click()
				await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}/feed`))
			}
		}
	})

	test('add phrase page loads for authenticated user', async ({ page }) => {
		await page
			.getByTestId('decks-list-grid')
			.getByText(TEST_LANG_DISPLAY)
			.click()

		// Look for add phrase link
		const addLink = page.getByRole('link', { name: /add.*phrase|new.*phrase/i })
		if ((await addLink.count()) > 0) {
			await addLink.first().click()

			// Should be on add phrase page
			await expect(page).toHaveURL(
				new RegExp(`/learn/${TEST_LANG}/(add|new|phrase)`)
			)

			// Should see form elements
			await expect(
				page.locator('textarea, input[type="text"]').first()
			).toBeVisible()
		}
	})

	test('deck settings page loads', async ({ page }) => {
		await page
			.getByTestId('decks-list-grid')
			.getByText(TEST_LANG_DISPLAY)
			.click()

		// Look for settings link (might be in a menu)
		const settingsLink = page.getByRole('link', { name: /settings/i })
		if ((await settingsLink.count()) > 0) {
			await settingsLink.first().click()

			// Should be on settings page
			await expect(page).toHaveURL(
				new RegExp(`/learn/${TEST_LANG}/deck-settings`)
			)
		}
	})

	test('bulk add page loads', async ({ page }) => {
		await page
			.getByTestId('decks-list-grid')
			.getByText(TEST_LANG_DISPLAY)
			.click()

		// Navigate to bulk add if link exists
		const bulkAddLink = page.getByRole('link', { name: /bulk.*add/i })
		if ((await bulkAddLink.count()) > 0) {
			await bulkAddLink.click()
			await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}/bulk-add`))
		}
	})

	test('navigation between multiple decks preserves state', async ({
		page,
	}) => {
		await page
			.getByTestId('decks-list-grid')
			.getByText(TEST_LANG_DISPLAY)
			.click()
		await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}`))

		// Go to search page using data-testid
		await page.getByTestId('appnav-search').click()
		await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}/search`))

		// Go back to learn page via sidebar - use the link with title "All Decks"
		// (The /learn link is in "Learning center" section with title "All Decks")
		await page.getByRole('link', { name: /all decks/i }).click()
		await expect(page).toHaveURL('/learn')

		// Go to Spanish if available
		const spanishLink = page.getByText('Spanish')
		if ((await spanishLink.count()) > 0) {
			await spanishLink.first().click()
			await expect(page).toHaveURL(/\/learn\/spa/)

			// Go back to learn page and then back to test lang
			await page.getByRole('link', { name: /all decks/i }).click()
			await expect(page).toHaveURL('/learn')

			await page
				.getByTestId('decks-list-grid')
				.getByText(TEST_LANG_DISPLAY)
				.click()
			await expect(page).toHaveURL(new RegExp(`/learn/${TEST_LANG}`))
		}
	})
})
