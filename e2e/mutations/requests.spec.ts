import { test } from '@playwright/test'
import { loginAsTestUser } from '../helpers/auth-helpers'

test.describe('Phrase Request Mutations', () => {
	test.skip('createRequestMutation: create new phrase request', async ({
		page,
	}) => {
		await loginAsTestUser(page)
		// TODO: Implement create request test
		// Navigate to new request page
		// Fill and submit form
		// Verify request in DB
	})

	test.skip('fulfillMutation: fulfill a phrase request', async ({ page }) => {
		await loginAsTestUser(page)
		// TODO: Implement fulfill request test
		// Have a pending request in DB
		// Navigate to request
		// Fulfill it by adding phrase
		// Verify request status updated
		// Verify phrase linked to request
	})
})
