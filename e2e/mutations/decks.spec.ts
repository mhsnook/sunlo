import { test, expect } from '@playwright/test'
import { loginAsTestUser, TEST_USER_UID } from '../helpers/auth-helpers'
import { getDeck, deleteDeck } from '../helpers/db-helpers'

const TEST_LANG = 'spa' // Spanish

// Tests run in sequence - each builds on the previous one
test.describe.serial('Deck Mutations', () => {
	// if there is a Spanish deck already present, delete it
	test.beforeAll(async () => {
		const { data: deck } = await getDeck(TEST_LANG, TEST_USER_UID)
		if (deck) await deleteDeck(TEST_LANG, TEST_USER_UID)
	})

	// maybe we should find and delete if present
	test('1. useNewDeckMutation: create new deck', async ({ page }) => {
		await loginAsTestUser(page)

		// Click deck-switcher in sidebar → "New deck"
		await page.click('button:has-text("Choose a deck")') // Opens deck switcher
		await page.getByRole('menuitem', { name: 'New deck' }).click()

		// Should be on add-deck page now
		await expect(page).toHaveURL(/\/learn\/add-deck/)

		// Open the language selector (Popover/Command component)
		await page.click('button:has-text("Select language")')

		// Wait for the popover to open and search input to be visible
		const searchInput = page.locator('input[placeholder="Search language..."]')
		await expect(searchInput).toBeVisible()

		// Type to search for Spanish - this will auto-select the first match
		await searchInput.fill('sp')

		// Wait for search results to appear, then press Down and Enter
		await searchInput.press('Enter')

		// Submit form
		await page.click('button:has-text("Start learning")')

		// Wait for both toast and navigation (order doesn't matter)
		await Promise.all([
			expect(page.getByText('Created a new deck to learn')).toBeVisible(),
			page.waitForURL(/\/learn\/spa/),
		])

		// Verify deck in decksCollection
		const deckInCollection = await page.evaluate((lang) => {
			// @ts-expect-error - accessing window global
			const collection = window.__decksCollection
			console.log({ collection })
			return collection?.get(lang)
		}, TEST_LANG)

		expect(deckInCollection).toBeTruthy()
		expect(deckInCollection?.lang).toBe(TEST_LANG)
		expect(deckInCollection?.uid).toBe(TEST_USER_UID)

		// Verify deck in DB
		const { data: dbDeck } = await getDeck(TEST_LANG, TEST_USER_UID)
		expect(dbDeck).toBeTruthy()
		expect(dbDeck?.lang).toBe(TEST_LANG)
		expect(dbDeck?.uid).toBe(TEST_USER_UID)
	})

	test('2. updateDailyGoalMutation: update daily review goal', async ({
		page,
	}) => {
		await loginAsTestUser(page)
		await expect(page).toHaveURL(/\/learn/)
		await expect(page.getByText('Spanish')).toBeVisible()
		await page.getByText('Spanish').click()
		await page.locator('#top-right-context-menu').click()
		// Click context menu in navbar → "Settings"
		await page.getByText('Settings', { exact: true }).click()

		// Should be on deck settings page
		await expect(page.locator('main').getByText('Deck Settings')).toBeVisible()

		// Select new daily review goal (change from 15 to 20)
		// await page.click('div:has-text("15 – Standard")')
		let deckInCollection = await page.evaluate((lang) => {
			// @ts-expect-error - accessing window global
			return window.__decksCollection?.get(lang)
		}, TEST_LANG)

		expect(deckInCollection?.daily_review_goal).toBe(15)

		await page.locator('label', { hasText: '10 – Relaxed' }).click()

		// Click "Update your daily goal"
		await page.getByRole('button', { name: 'Update your daily goal' }).click()

		// Wait for toast
		await expect(
			page.getByText('Your deck settings have been updated.')
		).toBeVisible()

		// Verify daily_review_goal updated in collection
		deckInCollection = await page.evaluate((lang) => {
			// @ts-expect-error - accessing window global
			return window.__decksCollection?.get(lang)
		}, TEST_LANG)

		expect(deckInCollection?.daily_review_goal).toBe(10)

		// Verify daily_review_goal updated in DB
		const { data: dbDeck } = await getDeck(TEST_LANG, TEST_USER_UID)
		expect(dbDeck?.daily_review_goal).toBe(10)
	})

	test('3. updateDeckGoalMutation: update deck goal/motivation', async ({
		page,
	}) => {
		await loginAsTestUser(page)

		// Navigate to deck settings
		await expect(page).toHaveURL(/\/learn/)
		await expect(page.getByText('Spanish')).toBeVisible()
		await page.getByText('Spanish').click()
		await page.locator('#top-right-context-menu').click()
		await page.getByText('Settings', { exact: true }).click()

		// Should be on deck settings page
		await expect(page.locator('main').getByText('Deck Settings')).toBeVisible()

		// Verify daily_review_goal updated in collection
		let deckInCollection = await page.evaluate((lang) => {
			// @ts-expect-error - accessing window global
			return window.__decksCollection?.get(lang)
		}, TEST_LANG)
		expect(deckInCollection?.learning_goal).toBe('moving')

		// Select new learning goal (change to "moving")
		await page.locator('label', { hasText: 'Family connection' }).click()

		// Click "Update your goal"
		await page.click('button:has-text("Update your goal")')

		// Wait for toast
		await expect(
			page.getByText('Your deck settings have been updated.')
		).toBeVisible()

		// Verify learning_goal updated in collection
		deckInCollection = await page.evaluate((lang) => {
			// @ts-expect-error - accessing window global
			return window.__decksCollection?.get(lang)
		}, TEST_LANG)

		expect(deckInCollection?.learning_goal).toBe('family')

		// Verify learning_goal updated in DB
		const { data: dbDeck } = await getDeck(TEST_LANG, TEST_USER_UID)
		expect(dbDeck?.learning_goal).toBe('family')
	})

	test('4. archiveDeckMutation: archive deck', async ({ page }) => {
		await loginAsTestUser(page)

		// Navigate to deck settings
		await expect(page).toHaveURL(/\/learn/)
		await expect(page.getByText('Spanish')).toBeVisible()
		await page.getByText('Spanish').click()
		await page.locator('#top-right-context-menu').click()
		await page.getByText('Settings', { exact: true }).click()

		// Should be on deck settings page
		await expect(page.locator('main').getByText('Deck Settings')).toBeVisible()

		// Click archive button to open confirmation dialog
		await page.getByRole('button', { name: 'Archive' }).click()

		// Wait for the alert dialog to appear
		await expect(page.getByRole('alertdialog')).toBeVisible()

		// Click the Archive button in the dialog to confirm
		await page
			.getByRole('alertdialog')
			.getByRole('button', { name: 'Archive' })
			.click()

		// Wait for confirmation toast
		await expect(page.getByText(/deck has been archived/i)).toBeVisible()

		// Click link to go back to /learn index
		await page.getByRole('link', { name: /all decks/i }).click()

		// Verify deck NOT visible on page
		await expect(page.getByText('Spanish')).not.toBeVisible()

		// Click "View archived decks" link
		await page.getByRole('link', { name: /view archived decks/i }).click()

		// Verify deck appears in archived list
		await expect(page.getByText('Spanish')).toBeVisible()

		// Verify archived: true in collection
		const deckInCollection = await page.evaluate((lang) => {
			// @ts-expect-error - accessing window global
			return window.__decksCollection?.get(lang)
		}, TEST_LANG)

		expect(deckInCollection?.archived).toBe(true)

		// Verify archived: true in DB
		const { data: dbDeck } = await getDeck(TEST_LANG, TEST_USER_UID)
		expect(dbDeck?.archived).toBe(true)
	})

	test('5. unarchiveDeckMutation: unarchive deck', async ({ page }) => {
		await loginAsTestUser(page)

		// Click the archived deck to navigate to it
		await expect(page).toHaveURL(/\/learn/)
		await page.getByRole('link', { name: /view archived decks/i }).click()
		await expect(page.getByText('Spanish')).toBeVisible()
		await page.getByText('Spanish').click()
		// Navigate to deck settings
		await page.locator('#top-right-context-menu').click()
		await page.getByText('Settings', { exact: true }).click()

		// Should be on deck settings page
		await expect(page.locator('main').getByText('Deck Settings')).toBeVisible()

		// Click archive button to open confirmation dialog
		await page.getByRole('button', { name: 'Restore deck' }).click()

		// Wait for the alert dialog to appear
		await expect(page.getByRole('alertdialog')).toBeVisible()

		// Click the Archive button in the dialog to confirm
		await page
			.getByRole('alertdialog')
			.getByRole('button', { name: 'Restore' })
			.click()

		// Wait for toast
		await expect(page.getByText(/re-activated/i)).toBeVisible()

		// Verify archived: false in collection
		const deckInCollection = await page.evaluate((lang) => {
			// @ts-expect-error - accessing window global
			return window.__decksCollection?.get(lang)
		}, TEST_LANG)

		expect(deckInCollection?.archived).toBe(false)

		// Verify archived: false in DB
		const { data: dbDeck } = await getDeck(TEST_LANG, TEST_USER_UID)
		expect(dbDeck?.archived).toBe(false)

		// Click link to go to /learn index
		await page.getByRole('link', { name: /all decks/i }).click()

		// Verify deck IS visible on page again
		await expect(page.getByText('Spanish')).toBeVisible()
	})

	// Cleanup: delete the test deck after all tests complete
	test.afterAll(async () => {
		await deleteDeck(TEST_LANG, TEST_USER_UID)
	})
})
