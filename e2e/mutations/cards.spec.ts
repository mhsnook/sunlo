import { test } from '@playwright/test'
import { loginAsTestUser } from '../helpers/auth-helpers'

test.describe('Card Status Mutations', () => {
	test.skip('useCardStatusMutation: change card status via dropdown', async ({
		page,
	}) => {
		await loginAsTestUser(page)
		// TODO: Implement card status change test via dropdown
		// Navigate to a phrase with a card
		// Open card status dropdown
		// Change status (active/learned/skipped)
		// Verify status in DB
		// Verify card appears in correct filtered view
	})

	test.skip('useCardStatusMutation: toggle learned via heart icon', async ({
		page,
	}) => {
		await loginAsTestUser(page)
		// TODO: Implement heart toggle test
		// Navigate to a phrase with a card
		// Click heart icon to mark as learned
		// Verify status changed to 'learned' in DB
		// Click again to unmark
		// Verify status changed back to 'active' in DB
	})

	test.skip('useCardStatusMutation: verify CardMetaSchema parsing', async ({
		page,
	}) => {
		await loginAsTestUser(page)
		// TODO: Verify card status updates parse correctly
		// Create a card
		// Change its status
		// Verify the updated card from user_card parses with CardMetaSchema
		// Verify it matches the user_card_plus view structure
	})
})
