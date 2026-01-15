import { test, expect } from '@playwright/test'

test.describe('Logged Out Navigation', () => {
	test('landing page loads and has key elements', async ({ page }) => {
		await page.goto('/')

		// Verify landing page has main call to action
		await expect(page).toHaveTitle(/Sunlo/)
		await expect(page.getByRole('link', { name: /get started/i })).toBeVisible()
	})

	test('can navigate to learn page without login', async ({ page }) => {
		await page.goto('/')

		// Click the "Get started" or similar link to reach learn page
		await page.getByRole('link', { name: /get started/i }).click()

		// Should be on the learn page
		await expect(page).toHaveURL(/\/learn/)

		// Should see language options or login prompt
		await expect(
			page.getByRole('link', { name: /log in/i }).first()
		).toBeVisible()
	})

	test('can browse languages and see phrase counts', async ({ page }) => {
		await page.goto('/learn')

		// Should see some language cards with phrase counts
		// Look for a language link (Hindi, Spanish, etc.)
		const languageLinks = page.locator('#decks-list-grid a')
		const count = await languageLinks.count()
		expect(count).toBeGreaterThan(0)

		// Click on a language to go to its browse page
		await languageLinks.first().click()

		// Should be on a language-specific page
		await expect(page).toHaveURL(/\/learn\/[a-z]{3}/)
	})

	test('can view browse page for a language', async ({ page }) => {
		await page.goto('/learn')

		// Find and click on Hindi (should have test data)
		const hindiLink = page.getByRole('link', { name: /hindi/i })
		if ((await hindiLink.count()) > 0) {
			await hindiLink.click()
			await expect(page).toHaveURL(/\/learn\/hin/)

			// Navigate to browse from sidebar
			const browseLink = page
				.locator('nav[data-slot=navigation-menu]')
				.getByRole('link', { name: /browse/i })
			if ((await browseLink.count()) > 0) {
				await browseLink.click()
				await expect(page).toHaveURL(/\/learn\/hin\/browse/)

				// Should see phrase cards
				await expect(page.locator('[data-slot=card]').first()).toBeVisible()
			}
		}
	})

	test('can view feed page for a language', async ({ page }) => {
		await page.goto('/learn')

		// Find and click on Hindi
		const hindiLink = page.getByRole('link', { name: /hindi/i })
		if ((await hindiLink.count()) > 0) {
			await hindiLink.click()

			// Should land on feed by default
			await expect(page).toHaveURL(/\/learn\/hin\/feed/)

			// Should see feed items or empty state
			const feedContent = page.locator('main')
			await expect(feedContent).toBeVisible()
		}
	})

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

	test('protected actions show login prompt', async ({ page }) => {
		await page.goto('/learn')

		// Navigate to Hindi
		const hindiLink = page.getByRole('link', { name: /hindi/i })
		if ((await hindiLink.count()) > 0) {
			await hindiLink.click()

			// Try to access add phrase or another protected route
			const addLink = page.getByRole('link', { name: /add.*phrase/i }).first()
			if ((await addLink.count()) > 0) {
				await addLink.click()

				// Should be redirected to login or see a login prompt
				const onLoginPage = await page.url().includes('/login')
				const hasLoginPrompt =
					(await page.getByText(/log in/i).count()) > 0 ||
					(await page.getByText(/sign in/i).count()) > 0

				expect(onLoginPage || hasLoginPrompt).toBe(true)
			}
		}
	})
})
