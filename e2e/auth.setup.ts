import { test as setup, expect } from '@playwright/test'
import { markAllIntrosAffirmed } from './helpers/collection-helpers'

// Test user credentials from seed data
const users = [
	{
		email: 'sunloapp@gmail.com',
		storagePath: '.auth/user-chromium.json',
	},
	{
		email: 'sunloapp+1@gmail.com',
		storagePath: '.auth/user-firefox.json',
	},
	{
		email: 'sunloapp+2@gmail.com',
		storagePath: '.auth/user-webkit.json',
	},
]

for (const { email, storagePath } of users) {
	setup(`authenticate ${email}`, async ({ page }) => {
		await page.goto('/login')

		// Pre-affirm all intro dialogs
		await markAllIntrosAffirmed(page)

		// Fill in credentials and submit
		await page.fill('input[name="email"]', email)
		await page.fill('input[name="password"]', 'password')
		await page.click('button[type="submit"]')

		// Wait for deterministic redirect: login → profile loads → isReady → Navigate → /learn
		await expect(page).toHaveURL(/\/learn$/, { timeout: 20000 })

		// Save storage state (cookies + localStorage including auth tokens and intro states)
		await page.context().storageState({ path: storagePath })
	})
}
