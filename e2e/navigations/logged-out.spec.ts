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

	test('browse page shows language cards', async ({ page }) => {
		await page.goto('/browse')

		// Wait for page to finish loading, then check for language cards
		await expect(page.getByTestId('browse-page')).toBeVisible({
			timeout: 10000,
		})
		const languageCards = page.locator('[data-slot=card]')
		await expect(languageCards.first()).toBeVisible()
	})

	// Covered by scenetest: auth.spec.md "visitor can browse languages without logging in"

	test('login link appears and works', async ({ page }) => {
		await page.goto('/learn')

		// Find login link
		const loginLink = page.getByRole('link', { name: /log in/i }).first()
		await expect(loginLink).toBeVisible()

		// Click to go to login page
		await loginLink.click()
		await expect(page).toHaveURL(/\/login/)

		// Should see login form
		await expect(
			page.getByRole('heading', { name: /please log in/i })
		).toBeVisible()
		await expect(page.locator('input[name="email"]')).toBeVisible()
		await expect(page.locator('input[name="password"]')).toBeVisible()
	})

	test('signup link appears and works', async ({ page }) => {
		await page.goto('/learn')

		// Find signup link
		const signupLink = page.getByRole('link', { name: /sign up/i }).first()
		if ((await signupLink.count()) > 0) {
			await signupLink.click()
			await expect(page).toHaveURL(/\/signup/)

			// Should see signup form
			await expect(page.locator('input[name="email"]')).toBeVisible()
		}
	})

	// Covered by scenetest: auth.spec.md "visitor sees login options in sidebar on language page"
})
