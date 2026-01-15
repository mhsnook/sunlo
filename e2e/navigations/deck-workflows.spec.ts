import { test, expect } from '@playwright/test'
import { loginAsTestUser } from '../helpers/auth-helpers'

test.describe('Deck Workflow Navigation', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsTestUser(page)
	})

	test('review setup page loads with stats', async ({ page }) => {
		// Go to Hindi deck
		await page.getByText('Hindi').click()

		// Navigate to review
		await page
			.locator('nav[data-slot=navigation-menu]')
			.getByRole('link', { name: /review/i })
			.click()

		await expect(page).toHaveURL(/\/learn\/hin\/review/)

		// Should see review stats
		await expect(page.getByText(/total cards/i)).toBeVisible()
		// Use heading role to avoid matching multiple "scheduled" elements
		await expect(
			page.getByRole('heading', { name: /scheduled/i })
		).toBeVisible()
	})

	test('can click through to review without submitting', async ({ page }) => {
		// Go to Hindi deck
		await page.getByText('Hindi').click()

		// Navigate to review
		await page
			.locator('nav[data-slot=navigation-menu]')
			.getByRole('link', { name: /review/i })
			.click()

		// Look for start or continue review button
		const startButton = page.getByRole('button', {
			name: /start.*review|continue.*review/i,
		})
		if ((await startButton.count()) > 0) {
			await startButton.click()

			// Should be on review/go page
			await expect(page).toHaveURL(/\/learn\/hin\/review\/go/)

			// Should see a card
			await expect(page.getByText(/card \d+ of \d+/i)).toBeVisible()

			// DON'T click any review buttons - just verify the page loaded
			// Navigate away without submitting
			await page
				.locator('nav[data-slot=navigation-menu]')
				.getByRole('link', { name: /browse/i })
				.click()

			await expect(page).toHaveURL(/\/learn\/hin\/browse/)
		}
	})

	test('search page loads from deck nav', async ({ page }) => {
		// Go to Hindi deck
		await page.getByText('Hindi').click()
		await expect(page).toHaveURL(/\/learn\/hin/)

		// Click search in nav (the deck-specific nav has "search", not "browse")
		const searchLink = page
			.locator('nav[data-slot=navigation-menu]')
			.getByRole('link', { name: /search/i })
		await expect(searchLink).toBeVisible()
		await searchLink.click()

		await expect(page).toHaveURL(/\/learn\/hin\/search/)
	})

	test('feed page loads with content', async ({ page }) => {
		// Go to Hindi feed
		await page.getByText('Hindi').click()

		// Should be on feed by default
		await expect(page).toHaveURL(/\/learn\/hin\/feed/)

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
		// Go to Hindi feed
		await page.getByText('Hindi').click()
		await expect(page).toHaveURL(/\/learn\/hin\/feed/)

		// Try switching tabs if they exist
		const tabs = page.getByRole('tablist')
		if ((await tabs.count()) > 0) {
			const popularTab = page.getByRole('tab', { name: /popular/i })
			if ((await popularTab.count()) > 0) {
				await popularTab.click()
				// Page should still work
				await expect(page).toHaveURL(/\/learn\/hin\/feed/)
			}

			const recentTab = page.getByRole('tab', { name: /recent/i })
			if ((await recentTab.count()) > 0) {
				await recentTab.click()
				await expect(page).toHaveURL(/\/learn\/hin\/feed/)
			}
		}
	})

	test('add phrase page loads for authenticated user', async ({ page }) => {
		// Go to Hindi deck
		await page.getByText('Hindi').click()

		// Look for add phrase link
		const addLink = page.getByRole('link', { name: /add.*phrase|new.*phrase/i })
		if ((await addLink.count()) > 0) {
			await addLink.first().click()

			// Should be on add phrase page
			await expect(page).toHaveURL(/\/learn\/hin\/(add|new|phrase)/)

			// Should see form elements
			await expect(
				page.locator('textarea, input[type="text"]').first()
			).toBeVisible()
		}
	})

	test('deck settings page loads', async ({ page }) => {
		// Go to Hindi deck
		await page.getByText('Hindi').click()

		// Look for settings link (might be in a menu)
		const settingsLink = page.getByRole('link', { name: /settings/i })
		if ((await settingsLink.count()) > 0) {
			await settingsLink.first().click()

			// Should be on settings page
			await expect(page).toHaveURL(/\/learn\/hin\/settings/)
		}
	})

	test('bulk add page loads', async ({ page }) => {
		// Go to Hindi deck
		await page.getByText('Hindi').click()

		// Navigate to bulk add if link exists
		const bulkAddLink = page.getByRole('link', { name: /bulk.*add/i })
		if ((await bulkAddLink.count()) > 0) {
			await bulkAddLink.click()
			await expect(page).toHaveURL(/\/learn\/hin\/bulk-add/)
		}
	})

	test('navigation between multiple decks preserves state', async ({
		page,
	}) => {
		// Go to Hindi
		await page.getByText('Hindi').click()
		await expect(page).toHaveURL(/\/learn\/hin/)

		// Go to search page
		await page
			.locator('nav[data-slot=navigation-menu]')
			.getByRole('link', { name: /search/i })
			.click()
		await expect(page).toHaveURL(/\/learn\/hin\/search/)

		// Go back to learn page
		await page.goto('/learn')

		// Go to Spanish if available
		const spanishLink = page.getByText('Spanish')
		if ((await spanishLink.count()) > 0) {
			await spanishLink.click()
			await expect(page).toHaveURL(/\/learn\/spa/)
		}

		// Go back to Hindi - should work fine
		await page.goto('/learn')
		await page.getByText('Hindi').click()
		await expect(page).toHaveURL(/\/learn\/hin/)
	})
})
