import { test } from '@playwright/test'
import { loginAsTestUser } from '../helpers/auth-helpers'

test.describe('Deck Mutations', () => {
	test.skip('useNewDeckMutation: create new deck', async ({ page }) => {
		await loginAsTestUser(page)
		// TODO: Implement new deck test
		// Navigate to deck creation
		// Fill form and submit
		// Verify deck appears in DB
		// Verify DeckMetaSchema parsing works with user_deck_plus view
	})

	test.skip('updateDailyGoalMutation: update daily review goal', async ({
		page,
	}) => {
		await loginAsTestUser(page)
		// TODO: Implement daily goal update test
		// Navigate to deck settings
		// Update daily goal
		// Verify update in DB
		// Verify DeckMetaRawSchema parsing works
	})

	test.skip('updateDeckGoalMutation: update deck motivation', async ({
		page,
	}) => {
		await loginAsTestUser(page)
		// TODO: Implement daily goal update test
		// Navigate to deck settings
		// Update deck goal
		// Verify update in DB
		// Verify DeckMetaRawSchema parsing works
	})

	test.skip('archiveDeckMutation: archive a deck', async ({ page }) => {
		await loginAsTestUser(page)
		// TODO: Implement archive deck test
		// Navigate to a deck
		// Archive it
		// Verify archived status in DB
		// Verify it's hidden from main view
	})

	test.skip('unarchiveDeckMutation: unarchive a deck', async ({ page }) => {
		await loginAsTestUser(page)
		// TODO: Implement unarchive deck test
		// Navigate to an archived deck
		// Unarchive it
		// Verify archived=false in DB
		// Verify it's shown in main view
	})
})
