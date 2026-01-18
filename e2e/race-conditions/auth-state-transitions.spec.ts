import { test, expect, Page } from '@playwright/test'
import { TEST_USER_EMAIL, TEST_USER_UID } from '../helpers/auth-helpers'

/**
 * These tests verify auth state transitions including:
 * - Login works and collections are loaded
 * - Sign out works and collections are cleared
 * - Page refresh maintains logged-in state
 * - Browsing while logged out then logging in properly loads collections
 */

// Helper to login via the UI (not using page.goto to preserve router state)
async function loginViaUI(page: Page, email: string, password: string) {
	// Navigate to login page via sidebar link
	const loginLink = page.getByRole('link', { name: /log in/i })
	if ((await loginLink.count()) > 0) {
		await loginLink.first().click()
	} else {
		// If no login link visible, might be on another page - go to home first
		await page.goto('/')
		await page
			.getByRole('link', { name: /log in/i })
			.first()
			.click()
	}

	await expect(page).toHaveURL(/\/login/)

	// Fill in credentials
	await page.fill('input[name="email"]', email)
	await page.fill('input[name="password"]', password)
	await page.getByRole('button', { name: /log in/i }).click()

	// Wait for either /learn or /welcome (for new users after profile creation)
	await page.waitForURL(/\/(learn|welcome)/, { timeout: 10000 })

	// If we landed on welcome page, click through to continue
	if (page.url().includes('/welcome')) {
		const continueButton = page.getByRole('link', {
			name: /(go to my decks|create my first deck|find friends)/i,
		})
		await continueButton.click()
		await page.waitForURL(/\/(learn|friends)/)
	}

	// Verify we're on /learn
	await expect(page).toHaveURL(/\/learn/, { timeout: 5000 })
}

// Helper to sign out via the sidebar user dropdown
async function signOutViaUI(page: Page) {
	// Open the sidebar if on mobile
	const sidebarTrigger = page.locator('[data-sidebar="trigger"]')
	if (await sidebarTrigger.isVisible()) {
		await sidebarTrigger.click()
	}

	// Click on the user menu button that contains the username
	// Use a more specific selector - the button with GarlicFace text
	const userMenuButton = page.getByRole('button', { name: /GarlicFace/i })
	await userMenuButton.click()

	// Click sign out in the dropdown
	const signOutItem = page.getByRole('menuitem', { name: /sign out/i })
	await expect(signOutItem).toBeVisible()
	await signOutItem.click()
}

// Helper to check auth state via localStorage
async function getAuthState(page: Page): Promise<{
	isAuth: boolean
	userId: string | null
}> {
	return page.evaluate(() => {
		// Check for supabase auth tokens in localStorage
		const keys = Object.keys(localStorage).filter((k) =>
			k.match(/^sb-.+-auth-token$/)
		)
		if (keys.length > 0) {
			try {
				const tokenData = JSON.parse(localStorage.getItem(keys[0]) || '{}')
				return {
					isAuth: !!tokenData?.user?.id,
					userId: tokenData?.user?.id || null,
				}
			} catch {
				return { isAuth: false, userId: null }
			}
		}
		return { isAuth: false, userId: null }
	})
}

test.describe('Auth State Transitions', () => {
	test.describe.configure({ mode: 'serial' })

	test('login flow works and shows user profile in sidebar', async ({
		page,
	}) => {
		// Start at home page logged out
		await page.goto('/')

		// Should see login link in sidebar
		const loginLink = page.getByRole('link', { name: /log in/i })
		await expect(loginLink.first()).toBeVisible()

		// Login via UI
		await loginViaUI(page, TEST_USER_EMAIL, 'password')

		// Verify we're on /learn
		await expect(page).toHaveURL(/\/learn/)

		// Verify sidebar shows user profile (not login link)
		await expect(page.getByText('GarlicFace').first()).toBeVisible({
			timeout: 5000,
		})

		// Verify we can see decks (collection loaded)
		await expect(page.getByText('Hindi').first()).toBeVisible()
	})

	test('sign out clears session and redirects to home', async ({ page }) => {
		// Start by logging in
		await page.goto('/')
		await loginViaUI(page, TEST_USER_EMAIL, 'password')
		await expect(page).toHaveURL(/\/learn/)

		// Verify logged in
		await expect(page.getByText('GarlicFace').first()).toBeVisible({
			timeout: 5000,
		})

		// Sign out via UI
		await signOutViaUI(page)

		// Should redirect to home page
		await expect(page).toHaveURL('/', { timeout: 10000 })

		// Verify login link is visible again (not logged in)
		const loginLink = page.getByRole('link', { name: /log in/i })
		await expect(loginLink.first()).toBeVisible({ timeout: 5000 })

		// Verify auth tokens are cleared from localStorage
		const authState = await getAuthState(page)
		expect(authState.isAuth).toBe(false)
		expect(authState.userId).toBeNull()
	})

	test('page refresh maintains logged-in state', async ({ page }) => {
		// Login first
		await page.goto('/')
		await loginViaUI(page, TEST_USER_EMAIL, 'password')
		await expect(page).toHaveURL(/\/learn/)
		await expect(page.getByText('GarlicFace').first()).toBeVisible({
			timeout: 5000,
		})

		// Refresh the page
		await page.reload()

		// Should still be logged in and on /learn
		await expect(page).toHaveURL(/\/learn/)
		await expect(page.getByText('GarlicFace').first()).toBeVisible({
			timeout: 5000,
		})
		await expect(page.getByText('Hindi').first()).toBeVisible()

		// Auth state should still be valid
		const authState = await getAuthState(page)
		expect(authState.isAuth).toBe(true)
		expect(authState.userId).toBe(TEST_USER_UID)
	})

	test('browsing while logged out, then logging in loads collections properly', async ({
		page,
	}) => {
		// Clear any existing session first (previous test may have left us logged in)
		await page.goto('/')
		await page.evaluate(() => {
			// Clear supabase tokens
			Object.keys(localStorage)
				.filter((k) => k.match(/^sb-.+-auth-token$/))
				.forEach((k) => localStorage.removeItem(k))
		})
		await page.reload()

		// Browse to a public page (home page)
		await expect(page.locator('h1').first()).toBeVisible()

		// Login link should be visible
		const loginLink = page.getByRole('link', { name: /log in/i })
		await expect(loginLink.first()).toBeVisible()

		// Login via UI
		await loginViaUI(page, TEST_USER_EMAIL, 'password')

		// Should be on /learn (not /learn/add-deck - that would indicate a race condition bug)
		await expect(page).toHaveURL(/\/learn$/, { timeout: 10000 })

		// User profile should be loaded in sidebar
		await expect(page.getByText('GarlicFace').first()).toBeVisible({
			timeout: 5000,
		})

		// Decks should be loaded - this is the key test
		// If decks don't show up, the collection wasn't loaded properly
		await expect(page.getByText('Hindi').first()).toBeVisible({ timeout: 5000 })

		// Navigate to a deck to verify cards collection loads
		await page.getByText('Hindi').first().click()
		await expect(page).toHaveURL(/\/learn\/hin/)
	})
})

test.describe('Sign Out Specific Tests', () => {
	test('sign out button is clickable and triggers sign out flow', async ({
		page,
	}) => {
		// Login first
		await page.goto('/')
		await loginViaUI(page, TEST_USER_EMAIL, 'password')
		await expect(page).toHaveURL(/\/learn/)

		// Wait for profile to load
		await expect(page.getByText('GarlicFace').first()).toBeVisible({
			timeout: 5000,
		})

		// Open user menu
		const userMenuButton = page.getByRole('button', { name: /GarlicFace/i })
		await userMenuButton.click()

		// Sign out item should be enabled (not disabled)
		const signOutItem = page.getByRole('menuitem', { name: /sign out/i })
		await expect(signOutItem).toBeVisible()
		await expect(signOutItem).not.toBeDisabled()

		// Click sign out
		await signOutItem.click()

		// Should navigate away from /learn
		await expect(page).not.toHaveURL(/\/learn/, { timeout: 10000 })

		// Should end up at home
		await expect(page).toHaveURL('/')
	})

	test('sign out clears auth tokens from localStorage', async ({ page }) => {
		// Login
		await page.goto('/')
		await loginViaUI(page, TEST_USER_EMAIL, 'password')
		await expect(page).toHaveURL(/\/learn/)

		// Verify tokens exist before sign out
		const tokensBefore = await page.evaluate(() => {
			return Object.keys(localStorage).filter((k) =>
				k.match(/^sb-.+-auth-token$/)
			)
		})
		expect(tokensBefore.length).toBeGreaterThan(0)

		// Sign out
		await expect(page.getByText('GarlicFace').first()).toBeVisible({
			timeout: 5000,
		})
		await signOutViaUI(page)

		// Wait for redirect
		await expect(page).toHaveURL('/', { timeout: 10000 })

		// Verify tokens are cleared
		const tokensAfter = await page.evaluate(() => {
			return Object.keys(localStorage).filter((k) =>
				k.match(/^sb-.+-auth-token$/)
			)
		})
		expect(tokensAfter.length).toBe(0)
	})
})

test.describe('Collection State Verification', () => {
	test('after login, sidebar shows correct user info', async ({ page }) => {
		await page.goto('/')
		await loginViaUI(page, TEST_USER_EMAIL, 'password')

		// Wait for collections to load
		await expect(page.getByText('GarlicFace').first()).toBeVisible({
			timeout: 5000,
		})

		// Verify decks are shown
		await expect(page.getByText('Hindi').first()).toBeVisible()
	})

	test('after sign out, sidebar shows login/signup links', async ({ page }) => {
		// Login first
		await page.goto('/')
		await loginViaUI(page, TEST_USER_EMAIL, 'password')
		await expect(page.getByText('GarlicFace').first()).toBeVisible({
			timeout: 5000,
		})

		// Sign out
		await signOutViaUI(page)
		await expect(page).toHaveURL('/', { timeout: 10000 })

		// Sidebar should show login/signup links
		const loginLink = page.getByRole('link', { name: /log in/i })
		await expect(loginLink.first()).toBeVisible({ timeout: 5000 })

		const signupLink = page.getByRole('link', { name: /sign up/i })
		await expect(signupLink.first()).toBeVisible()

		// User profile elements should NOT be visible
		await expect(page.getByText('GarlicFace')).not.toBeVisible()
	})

	test('after sign out, home page shows login link not avatar', async ({
		page,
	}) => {
		// Login first
		await page.goto('/')
		await loginViaUI(page, TEST_USER_EMAIL, 'password')

		// Wait for profile to load
		await expect(page.getByText('GarlicFace').first()).toBeVisible({
			timeout: 5000,
		})

		// Navigate to home page and verify avatar link is shown (links to /learn)
		await page.goto('/')
		const avatarLink = page.locator('a[title="Go to app"]')
		await expect(avatarLink).toBeVisible({ timeout: 5000 })

		// Sign out
		await page.goto('/learn')
		await signOutViaUI(page)
		await expect(page).toHaveURL('/', { timeout: 10000 })

		// Home page should show login link, NOT the avatar
		// The login link should have title "Log in"
		const loginButton = page.locator('a[title="Log in"]')
		await expect(loginButton).toBeVisible({ timeout: 5000 })

		// Avatar link should NOT be visible
		await expect(avatarLink).not.toBeVisible()
	})
})
