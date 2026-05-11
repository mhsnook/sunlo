import { test, expect } from '@playwright/test'

// These tests verify logged-out navigation from a fresh browser state
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Logged Out Navigation', () => {
	test('landing page loads and has key elements', async ({ page }) => {
		await page.goto('/')

		// Verify landing page has main call to action
		await expect(page).toHaveTitle(/Sunlo/)
		// Landing page has "Start Learning", "Browse Library", and "Sign In" links
		// Use first() since there may be duplicate links (header + main CTA)
		await expect(
			page.getByRole('link', { name: /start learning/i }).first()
		).toBeVisible()
		await expect(
			page.getByRole('link', { name: /browse library/i }).first()
		).toBeVisible()
	})

	test('can navigate to browse page from landing', async ({ page }) => {
		await page.goto('/')

		// Click "Browse Library" to reach the browse page
		await page
			.getByRole('link', { name: /browse library/i })
			.first()
			.click()

		// Should be on the browse page
		await expect(page).toHaveURL(/\/browse/)
	})

	test('can navigate to signup from landing', async ({ page }) => {
		await page.goto('/')

		// Click "Start Learning" to reach signup
		await page
			.getByRole('link', { name: /start learning/i })
			.first()
			.click()

		// Should be on the signup page
		await expect(page).toHaveURL(/\/signup/)
	})

	test('learn page shows browse prompt for logged-out users', async ({
		page,
	}) => {
		await page.goto('/learn')

		// Logged-out users see a browse prompt, not deck list
		await expect(page.getByText(/welcome to sunlo/i)).toBeVisible()
		await expect(
			page.getByRole('link', { name: /browse languages/i })
		).toBeVisible()
	})

	test('can navigate to browse from learn page', async ({ page }) => {
		await page.goto('/learn')

		// Click "Browse languages" button
		await page.getByRole('link', { name: /browse languages/i }).click()

		// Should be on the browse page
		await expect(page).toHaveURL(/\/browse/)
	})

	// Covered by scenetest:
	// - auth.spec.md "visitor can browse languages without logging in" (browse page)
	// - auth.spec.md "visitor sees login options in sidebar on language page" (login link)
	// - auth.spec.md "login page shows signup and forgot-password links" (signup link)
})
